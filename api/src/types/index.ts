// Cloudflare Workers Environment
export interface Env {
  // R2 Bucket
  PHOTO_BUCKET: R2Bucket;
  
  // D1 Database
  DB: D1Database;
  
  // KV Store
  CACHE: KVNamespace;
  
  // Environment Variables
  ENVIRONMENT: string;
  JWT_SECRET: string;
  CORS_ORIGINS: string;
}

// Photo Entity
export interface Photo {
  id: string;
  filename: string;
  original_key: string;
  thumb_key?: string;
  medium_key?: string;
  file_size: number;
  content_type: string;
  upload_date: string;
  storage_class: 'Standard' | 'IA';
  ia_transition_date?: string;
  exif_data?: Record<string, any>;
  date_taken?: string;
  camera_model?: string;
  gps_lat?: number;
  gps_lng?: number;
  view_count: number;
  last_accessed?: string;
  original_access_count: number;
}

// EXIF Data Structure
export interface EXIFData {
  date_taken?: string;
  camera_model?: string;
  lens_model?: string;
  focal_length?: number;
  aperture?: string;
  iso?: number;
  exposure_time?: string;
  gps?: {
    lat: number;
    lng: number;
    altitude?: number;
  };
  dimensions?: {
    width: number;
    height: number;
  };
}

// Upload Related Types
export interface UploadRequest {
  filename: string;
  file_size: number;
  content_type: string;
  exif_data?: EXIFData;
}

export interface PresignedUrlResponse {
  upload_url: string;
  photo_id: string;
  fields?: Record<string, string>;
  expires_at: string;
}

export interface UploadCompleteRequest {
  photo_id: string;
  etag: string;
  actual_size: number;
}

// API Response Types
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PhotoListResponse {
  photos: Photo[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_count: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface PhotoDetailResponse extends Photo {
  thumb_url?: string;
  medium_url?: string;
  original_url?: string; // Only if requested explicitly
}

// Search and Filter
export interface PhotoSearchParams {
  page?: number;
  limit?: number;
  sort_by?: 'upload_date' | 'date_taken' | 'file_size' | 'filename';
  sort_order?: 'asc' | 'desc';
  date_from?: string;
  date_to?: string;
  camera_model?: string;
  storage_class?: 'Standard' | 'IA';
  search?: string; // filename search
}

// Usage Statistics
export interface UsageStats {
  date: string;
  total_storage_gb: number;
  standard_storage_gb: number;
  ia_storage_gb: number;
  monthly_cost_usd: number;
  class_a_operations: number;
  class_b_operations: number;
  ia_retrievals: number;
  ia_retrieval_gb: number;
}

export interface CostDashboard {
  storage: {
    standard_gb: number;
    ia_gb: number;
    total_gb: number;
    free_quota_remaining: number;
  };
  monthly_cost: {
    storage_standard: number;
    storage_ia: number;
    operations_class_a: number;
    operations_class_b: number;
    ia_retrievals: number;
    total_usd: number;
  };
  projection: {
    month_end_total_usd: number;
    quota_exhaustion_date?: string;
    cost_alerts: Alert[];
  };
}

export interface Alert {
  type: 'quota_80' | 'quota_95' | 'cost_threshold';
  message: string;
  severity: 'warning' | 'critical';
  triggered_at: string;
}

// Authentication
export interface AuthRequest {
  username?: string;
  email?: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    created_at: string;
  };
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  iat: number;
  exp: number;
}

// Error Types
export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Storage Quota Check
export interface QuotaCheckResult {
  can_upload: boolean;
  available_space_gb: number;
  required_space_gb: number;
  warning_message?: string;
}

// Multipart Upload
export interface MultipartUploadInit {
  upload_id: string;
  photo_id: string;
  part_size: number;
  total_parts: number;
}

export interface MultipartUploadPart {
  part_number: number;
  upload_url: string;
  size: number;
}

export interface MultipartUploadComplete {
  upload_id: string;
  parts: Array<{
    part_number: number;
    etag: string;
  }>;
}

// Processing Status
export interface ProcessingStatus {
  photo_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  created_at: string;
  completed_at?: string;
  error_message?: string;
  variants_generated: {
    thumbnail: boolean;
    medium: boolean;
  };
}

// Cache Keys
export type CacheKey = 
  | `photo_meta:${string}`
  | `photo_list:page_${number}:sort_${string}`
  | `usage_stats:${string}`
  | `presigned_url:${string}:${string}`
  | `session:${string}`;

// Database Schema Types (matching D1 tables)
export interface PhotoRecord {
  id: string;
  filename: string;
  original_key: string;
  thumb_key: string | null;
  medium_key: string | null;
  file_size: number;
  content_type: string;
  upload_date: string;
  storage_class: string;
  ia_transition_date: string | null;
  exif_data: string | null; // JSON string
  date_taken: string | null;
  camera_model: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  view_count: number;
  last_accessed: string | null;
  original_access_count: number;
}

export interface UsageStatsRecord {
  date: string;
  total_storage_gb: number;
  standard_storage_gb: number;
  ia_storage_gb: number;
  monthly_cost_usd: number | null;
  class_a_operations: number;
  class_b_operations: number;
  ia_retrievals: number;
  ia_retrieval_gb: number;
}

export interface AlertSettingsRecord {
  id: number;
  alert_type: string;
  threshold_value: number;
  is_enabled: number; // SQLite boolean as integer
  created_at: string;
}

export interface AccessLogRecord {
  id: number;
  photo_id: string;
  access_type: string;
  accessed_at: string;
  cost_incurred_usd: number;
}
