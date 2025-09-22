import type { Env, QuotaCheckResult, PresignedUrlResponse } from '../types';
import { APIError } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Storage pricing constants (USD)
export const STORAGE_PRICING = {
  STANDARD: 0.015, // per GB per month
  IA: 0.01, // per GB per month
  CLASS_A_OPS: 4.5 / 1000000, // per operation
  CLASS_B_OPS: 0.36 / 1000000, // per operation
  IA_RETRIEVAL: 0.01, // per GB
  FREE_QUOTA_GB: 10,
} as const;

// File size limits
export const SIZE_LIMITS = {
  SINGLE_UPLOAD_MAX: 5 * 1024 * 1024 * 1024, // 5GB
  MULTIPART_MIN: 100 * 1024 * 1024, // 100MB
  PART_MIN: 5 * 1024 * 1024, // 5MB
  PART_MAX: 5 * 1024 * 1024 * 1024, // 5GB
  MAX_PARTS: 10000,
} as const;

/**
 * Check storage quota before upload
 */
export async function checkStorageQuota(
  env: Env,
  fileSizeBytes: number
): Promise<QuotaCheckResult> {
  try {
    // Get current usage from database
    const stmt = env.DB.prepare(`
      SELECT 
        COALESCE(SUM(file_size), 0) as total_bytes
      FROM photos 
      WHERE upload_date >= date('now', 'start of month')
    `);
    
    const result = await stmt.first<{ total_bytes: number }>();
    const currentUsageGB = (result?.total_bytes || 0) / (1024 ** 3);
    const fileSizeGB = fileSizeBytes / (1024 ** 3);
    const totalAfterUploadGB = currentUsageGB + fileSizeGB;
    
    const availableSpaceGB = STORAGE_PRICING.FREE_QUOTA_GB - currentUsageGB;
    
    if (totalAfterUploadGB > STORAGE_PRICING.FREE_QUOTA_GB) {
      return {
        can_upload: false,
        available_space_gb: availableSpaceGB,
        required_space_gb: fileSizeGB,
        warning_message: `Upload would exceed free quota. Available: ${availableSpaceGB.toFixed(2)}GB, Required: ${fileSizeGB.toFixed(2)}GB`,
      };
    }
    
    // Warning at 80% usage
    const warningThreshold = STORAGE_PRICING.FREE_QUOTA_GB * 0.8;
    let warningMessage: string | undefined;
    
    if (totalAfterUploadGB > warningThreshold) {
      const remainingAfterUpload = STORAGE_PRICING.FREE_QUOTA_GB - totalAfterUploadGB;
      warningMessage = `Approaching quota limit. After upload: ${remainingAfterUpload.toFixed(2)}GB remaining`;
    }
    
    return {
      can_upload: true,
      available_space_gb: availableSpaceGB,
      required_space_gb: fileSizeGB,
      warning_message: warningMessage,
    };
  } catch (error) {
    console.error('Storage quota check failed:', error);
    throw new APIError(500, 'Failed to check storage quota');
  }
}

/**
 * Generate R2 object key with proper structure
 */
export function generateObjectKey(
  prefix: 'original' | 'thumb' | 'medium',
  filename: string,
  photoId: string
): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  
  // Extract file extension
  const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
  
  return `${prefix}/${year}/${month}/${photoId}.${ext}`;
}

/**
 * Generate presigned URL for upload
 */
export async function generatePresignedUploadUrl(
  env: Env,
  filename: string,
  fileSize: number,
  contentType: string
): Promise<PresignedUrlResponse> {
  const photoId = uuidv4();
  const objectKey = generateObjectKey('original', filename, photoId);
  
  // Check if multipart upload is needed
  const useMultipart = fileSize > SIZE_LIMITS.MULTIPART_MIN;
  
  if (useMultipart) {
    // For large files, return multipart upload initialization
    const multipartUpload = await env.PHOTO_BUCKET.createMultipartUpload(objectKey);
    
    // Store multipart upload info in KV for later use
    const multipartInfo = {
      upload_id: multipartUpload.uploadId,
      photo_id: photoId,
      object_key: objectKey,
      file_size: fileSize,
      content_type: contentType,
      filename: filename,
      created_at: new Date().toISOString(),
    };
    
    await env.CACHE.put(
      `multipart:${photoId}`,
      JSON.stringify(multipartInfo),
      { expirationTtl: 86400 } // 24 hours
    );
    
    return {
      upload_url: `/api/upload/multipart/${photoId}`, // Custom endpoint for multipart
      photo_id: photoId,
      expires_at: new Date(Date.now() + 86400000).toISOString(), // 24 hours
    };
  } else {
    // Standard single upload
    const presignedUrl = await env.PHOTO_BUCKET.createPresignedUrl(
      objectKey,
      'PUT',
      {
        expiresIn: 3600, // 1 hour
        httpMetadata: {
          contentType,
        },
      }
    );
    
    return {
      upload_url: presignedUrl.toString(),
      photo_id: photoId,
      expires_at: new Date(Date.now() + 3600000).toISOString(), // 1 hour
    };
  }
}

/**
 * Generate presigned URL for download
 */
export async function generatePresignedDownloadUrl(
  env: Env,
  objectKey: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const presignedUrl = await env.PHOTO_BUCKET.createPresignedUrl(
    objectKey,
    'GET',
    { expiresIn: expiresInSeconds }
  );
  
  return presignedUrl.toString();
}

/**
 * Calculate estimated monthly cost
 */
export function calculateMonthlyCost(storageGB: number, iaStorageGB: number): number {
  const standardStorageCost = storageGB * STORAGE_PRICING.STANDARD;
  const iaStorageCost = iaStorageGB * STORAGE_PRICING.IA;
  
  return standardStorageCost + iaStorageCost;
}

/**
 * Calculate IA retrieval cost
 */
export function calculateIARetrievalCost(fileSizeBytes: number): number {
  const fileSizeGB = fileSizeBytes / (1024 ** 3);
  return fileSizeGB * STORAGE_PRICING.IA_RETRIEVAL;
}

/**
 * Validate file type for photo uploads
 */
export function validatePhotoFileType(contentType: string): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/heic',
    'image/heif',
  ];
  
  return allowedTypes.includes(contentType.toLowerCase());
}

/**
 * Determine if Workers body size limit would be exceeded
 */
export function checkWorkersSizeLimit(fileSizeBytes: number, plan: 'free' | 'pro' | 'business' | 'enterprise'): {
  exceeded: boolean;
  limit: number;
  shouldUseMultipart: boolean;
} {
  const limits = {
    free: 100 * 1024 * 1024,        // 100MB
    pro: 100 * 1024 * 1024,         // 100MB  
    business: 200 * 1024 * 1024,    // 200MB
    enterprise: 500 * 1024 * 1024,  // 500MB
  };
  
  const limit = limits[plan];
  const exceeded = fileSizeBytes > limit;
  const shouldUseMultipart = fileSizeBytes > SIZE_LIMITS.MULTIPART_MIN;
  
  return {
    exceeded,
    limit,
    shouldUseMultipart,
  };
}

/**
 * Get current storage usage statistics
 */
export async function getCurrentStorageUsage(env: Env): Promise<{
  totalGB: number;
  standardGB: number;
  iaGB: number;
  fileCount: number;
}> {
  try {
    const stmt = env.DB.prepare(`
      SELECT 
        COUNT(*) as file_count,
        COALESCE(SUM(CASE WHEN storage_class = 'Standard' THEN file_size ELSE 0 END), 0) as standard_bytes,
        COALESCE(SUM(CASE WHEN storage_class = 'IA' THEN file_size ELSE 0 END), 0) as ia_bytes,
        COALESCE(SUM(file_size), 0) as total_bytes
      FROM photos
    `);
    
    const result = await stmt.first<{
      file_count: number;
      standard_bytes: number;
      ia_bytes: number;
      total_bytes: number;
    }>();
    
    if (!result) {
      return { totalGB: 0, standardGB: 0, iaGB: 0, fileCount: 0 };
    }
    
    return {
      totalGB: result.total_bytes / (1024 ** 3),
      standardGB: result.standard_bytes / (1024 ** 3),
      iaGB: result.ia_bytes / (1024 ** 3),
      fileCount: result.file_count,
    };
  } catch (error) {
    console.error('Failed to get storage usage:', error);
    throw new APIError(500, 'Failed to retrieve storage usage');
  }
}
