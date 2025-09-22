import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import type { 
  Env, 
  PresignedUrlResponse, 
  UploadRequest, 
  UploadCompleteRequest, 
  APIResponse,
  ProcessingStatus 
} from '../types';
import { APIError } from '../types';
import { authMiddleware } from '../middleware/auth';
import { 
  checkStorageQuota, 
  generatePresignedUploadUrl, 
  generateObjectKey,
  validatePhotoFileType,
  checkWorkersSizeLimit,
  SIZE_LIMITS 
} from '../utils/storage';

const upload = new Hono<{ Bindings: Env }>();

// Validation schemas
const presignRequestSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  file_size: z.number().positive('File size must be positive'),
  content_type: z.string().min(1, 'Content type is required'),
  exif_data: z.record(z.any()).optional(),
});

const completeUploadSchema = z.object({
  photo_id: z.string().uuid('Invalid photo ID'),
  etag: z.string().min(1, 'ETag is required'),
  actual_size: z.number().positive('Actual size must be positive'),
});

const multipartCompleteSchema = z.object({
  upload_id: z.string().min(1, 'Upload ID is required'),
  parts: z.array(z.object({
    part_number: z.number().positive(),
    etag: z.string().min(1),
  })).min(1, 'At least one part is required'),
});

/**
 * POST /upload/presign - Generate presigned URL for upload
 */
upload.post('/presign', authMiddleware, zValidator('json', presignRequestSchema), async (c) => {
  try {
    const user = c.get('user');
    const { filename, file_size, content_type, exif_data } = c.req.valid('json');
    
    // Validate file type
    if (!validatePhotoFileType(content_type)) {
      throw new APIError(400, 'Unsupported file type. Only images are allowed.');
    }
    
    // Check file size limits
    if (file_size > SIZE_LIMITS.SINGLE_UPLOAD_MAX) {
      throw new APIError(400, `File too large. Maximum size is ${SIZE_LIMITS.SINGLE_UPLOAD_MAX / (1024**3)}GB`);
    }
    
    // Check storage quota
    const quotaCheck = await checkStorageQuota(c.env, file_size);
    if (!quotaCheck.can_upload) {
      throw new APIError(413, quotaCheck.warning_message || 'Storage quota exceeded');
    }
    
    // Check Workers size limits
    const sizeCheck = checkWorkersSizeLimit(file_size, 'free'); // TODO: Get plan from user settings
    
    // Generate presigned URL
    const presignedResponse = await generatePresignedUploadUrl(
      c.env, 
      filename, 
      file_size, 
      content_type
    );
    
    // Create photo record in database
    const photoId = presignedResponse.photo_id;
    const objectKey = generateObjectKey('original', filename, photoId);
    
    await c.env.DB.prepare(`
      INSERT INTO photos (
        id, filename, original_key, file_size, content_type, 
        upload_date, storage_class, exif_data, 
        date_taken, camera_model, gps_lat, gps_lng,
        view_count, original_access_count, user_id
      ) VALUES (?, ?, ?, ?, ?, datetime('now'), 'Standard', ?, ?, ?, ?, ?, 0, 0, ?)
    `).bind(
      photoId,
      filename,
      objectKey,
      file_size,
      content_type,
      exif_data ? JSON.stringify(exif_data) : null,
      exif_data?.date_taken || null,
      exif_data?.camera_model || null,
      exif_data?.gps?.lat || null,
      exif_data?.gps?.lng || null,
      user.sub
    ).run();
    
    const response: APIResponse<PresignedUrlResponse & { quota_warning?: string }> = {
      success: true,
      data: {
        ...presignedResponse,
        quota_warning: quotaCheck.warning_message,
      },
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Presign URL generation error:', error);
    throw new APIError(500, 'Failed to generate upload URL');
  }
});

/**
 * POST /upload/complete - Mark upload as complete and trigger processing
 */
upload.post('/complete', authMiddleware, zValidator('json', completeUploadSchema), async (c) => {
  try {
    const user = c.get('user');
    const { photo_id, etag, actual_size } = c.req.valid('json');
    
    // Verify the photo belongs to the user and update status
    const photo = await c.env.DB.prepare(`
      SELECT id, filename, original_key, file_size 
      FROM photos 
      WHERE id = ? AND user_id = ?
    `).bind(photo_id, user.sub).first<{
      id: string;
      filename: string;
      original_key: string;
      file_size: number;
    }>();
    
    if (!photo) {
      throw new APIError(404, 'Photo not found or access denied');
    }
    
    // Update photo with actual upload details
    await c.env.DB.prepare(`
      UPDATE photos 
      SET file_size = ?, upload_completed = 1, etag = ?, completed_at = datetime('now')
      WHERE id = ?
    `).bind(actual_size, etag, photo_id).run();
    
    // Queue photo processing (thumbnail and medium size generation)
    const processingStatus: ProcessingStatus = {
      photo_id: photo_id,
      status: 'pending',
      progress: 0,
      created_at: new Date().toISOString(),
      variants_generated: {
        thumbnail: false,
        medium: false,
      },
    };
    
    // Store processing status in KV
    await c.env.CACHE.put(
      `processing:${photo_id}`,
      JSON.stringify(processingStatus),
      { expirationTtl: 86400 } // 24 hours
    );
    
    // Trigger async processing (this would be handled by a separate Worker or Queue)
    // For now, we'll just mark it as completed
    // TODO: Implement actual image processing with Cloudflare Images or similar
    
    const response: APIResponse<{ photo_id: string; processing_status: string }> = {
      success: true,
      data: {
        photo_id: photo_id,
        processing_status: 'queued',
      },
      message: 'Upload completed successfully. Image processing started.',
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Upload completion error:', error);
    throw new APIError(500, 'Failed to complete upload');
  }
});

/**
 * GET /upload/status/:id - Check upload/processing status
 */
upload.get('/status/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const photoId = c.req.param('id');
    
    if (!photoId) {
      throw new APIError(400, 'Photo ID is required');
    }
    
    // Check if photo exists and belongs to user
    const photo = await c.env.DB.prepare(`
      SELECT id, filename, upload_completed, completed_at
      FROM photos 
      WHERE id = ? AND user_id = ?
    `).bind(photoId, user.sub).first<{
      id: string;
      filename: string;
      upload_completed: number;
      completed_at: string | null;
    }>();
    
    if (!photo) {
      throw new APIError(404, 'Photo not found or access denied');
    }
    
    // Get processing status from KV
    const processingStatusStr = await c.env.CACHE.get(`processing:${photoId}`);
    let processingStatus: ProcessingStatus | null = null;
    
    if (processingStatusStr) {
      processingStatus = JSON.parse(processingStatusStr);
    }
    
    const response: APIResponse = {
      success: true,
      data: {
        photo_id: photoId,
        upload_completed: photo.upload_completed === 1,
        completed_at: photo.completed_at,
        processing_status: processingStatus,
      },
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Status check error:', error);
    throw new APIError(500, 'Failed to check upload status');
  }
});

/**
 * POST /upload/multipart/:id/init - Initialize multipart upload
 */
upload.post('/multipart/:id/init', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const photoId = c.req.param('id');
    
    // Get multipart upload info from KV
    const multipartInfoStr = await c.env.CACHE.get(`multipart:${photoId}`);
    if (!multipartInfoStr) {
      throw new APIError(404, 'Multipart upload not found or expired');
    }
    
    const multipartInfo = JSON.parse(multipartInfoStr);
    
    // Calculate part size (aim for ~100MB chunks)
    const totalSize = multipartInfo.file_size;
    const targetPartSize = 100 * 1024 * 1024; // 100MB
    const numParts = Math.ceil(totalSize / targetPartSize);
    const actualPartSize = Math.ceil(totalSize / numParts);
    
    const response: APIResponse = {
      success: true,
      data: {
        upload_id: multipartInfo.upload_id,
        photo_id: photoId,
        part_size: actualPartSize,
        total_parts: numParts,
        total_size: totalSize,
      },
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Multipart init error:', error);
    throw new APIError(500, 'Failed to initialize multipart upload');
  }
});

/**
 * GET /upload/multipart/:id/part/:partNumber - Get presigned URL for part upload
 */
upload.get('/multipart/:id/part/:partNumber', authMiddleware, async (c) => {
  try {
    const photoId = c.req.param('id');
    const partNumber = parseInt(c.req.param('partNumber') || '0');
    
    if (partNumber < 1 || partNumber > SIZE_LIMITS.MAX_PARTS) {
      throw new APIError(400, `Invalid part number. Must be between 1 and ${SIZE_LIMITS.MAX_PARTS}`);
    }
    
    // Get multipart upload info
    const multipartInfoStr = await c.env.CACHE.get(`multipart:${photoId}`);
    if (!multipartInfoStr) {
      throw new APIError(404, 'Multipart upload not found or expired');
    }
    
    const multipartInfo = JSON.parse(multipartInfoStr);
    
    // Generate presigned URL for this part
    const partUploadUrl = await c.env.PHOTO_BUCKET.createPresignedUrl(
      multipartInfo.object_key,
      'PUT',
      {
        expiresIn: 3600, // 1 hour
        uploadId: multipartInfo.upload_id,
        partNumber: partNumber,
      }
    );
    
    const response: APIResponse = {
      success: true,
      data: {
        part_number: partNumber,
        upload_url: partUploadUrl.toString(),
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Multipart part URL error:', error);
    throw new APIError(500, 'Failed to generate part upload URL');
  }
});

/**
 * POST /upload/multipart/:id/complete - Complete multipart upload
 */
upload.post('/multipart/:id/complete', authMiddleware, zValidator('json', multipartCompleteSchema), async (c) => {
  try {
    const user = c.get('user');
    const photoId = c.req.param('id');
    const { upload_id, parts } = c.req.valid('json');
    
    // Get multipart upload info
    const multipartInfoStr = await c.env.CACHE.get(`multipart:${photoId}`);
    if (!multipartInfoStr) {
      throw new APIError(404, 'Multipart upload not found or expired');
    }
    
    const multipartInfo = JSON.parse(multipartInfoStr);
    
    // Complete the multipart upload
    const completedUpload = await c.env.PHOTO_BUCKET.completeMultipartUpload(
      multipartInfo.object_key,
      upload_id,
      parts
    );
    
    // Update photo record
    await c.env.DB.prepare(`
      UPDATE photos 
      SET upload_completed = 1, etag = ?, completed_at = datetime('now')
      WHERE id = ? AND user_id = ?
    `).bind(completedUpload.etag, photoId, user.sub).run();
    
    // Clean up multipart info from KV
    await c.env.CACHE.delete(`multipart:${photoId}`);
    
    // Queue processing
    const processingStatus: ProcessingStatus = {
      photo_id: photoId,
      status: 'pending',
      progress: 0,
      created_at: new Date().toISOString(),
      variants_generated: {
        thumbnail: false,
        medium: false,
      },
    };
    
    await c.env.CACHE.put(
      `processing:${photoId}`,
      JSON.stringify(processingStatus),
      { expirationTtl: 86400 }
    );
    
    const response: APIResponse = {
      success: true,
      data: {
        photo_id: photoId,
        etag: completedUpload.etag,
        processing_status: 'queued',
      },
      message: 'Multipart upload completed successfully',
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Multipart complete error:', error);
    throw new APIError(500, 'Failed to complete multipart upload');
  }
});

export default upload;
