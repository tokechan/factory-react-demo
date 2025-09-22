// Frontend types for Photo Archive System
// These should match the API types in api/src/types/index.ts

export interface User {
  id: string;
  email: string;
  created_at: string;
  last_login?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

// Photo related types
export interface Photo {
  id: string;
  filename: string;
  name: string; // Display name for the photo
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
  thumb_url?: string;
  medium_url?: string;
  original_url?: string;
  // Share-related properties for compatibility
  size?: number;
  width?: number;
  height?: number;
  url?: string;
  allowDownload?: boolean;
  allowZoom?: boolean;
  watermark?: boolean;
  taken_at?: string;
  metadata?: {
    exif?: Record<string, any>;
    location?: {
      latitude: number;
      longitude: number;
    };
  };
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

export interface PhotoSearchParams {
  page?: number;
  limit?: number;
  sort_by?: 'upload_date' | 'date_taken' | 'file_size' | 'filename';
  sort_order?: 'asc' | 'desc';
  date_from?: string;
  date_to?: string;
  camera_model?: string;
  storage_class?: 'Standard' | 'IA';
  search?: string;
}

// Upload related types
export interface UploadRequest {
  filename: string;
  file_size: number;
  content_type: string;
  exif_data?: Record<string, any>;
}

export interface PresignedUrlResponse {
  upload_url: string;
  photo_id: string;
  fields?: Record<string, string>;
  expires_at: string;
  quota_warning?: string;
}

export interface UploadProgress {
  photo_id: string;
  filename: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

// Statistics and cost types
export interface UsageStats {
  storage: {
    total_gb: number;
    standard_gb: number;
    ia_gb: number;
    file_count: number;
    free_quota_remaining: number;
  };
  monthly_stats: {
    uploads: number;
    original_accesses: number;
    cost_incurred_usd: number;
  };
  monthly_cost: {
    storage_usd: number;
    total_usd: number;
  };
  file_types: Array<{
    content_type: string;
    count: number;
    total_size: number;
  }>;
  quota_percentage: number;
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

// API Response wrapper
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// UI State types
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  photos: Photo[];
  selectedPhoto: Photo | null;
  searchParams: PhotoSearchParams;
  uploadQueue: UploadProgress[];
  usageStats: UsageStats | null;
  costDashboard: CostDashboard | null;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SearchFormData {
  search: string;
  date_from: string;
  date_to: string;
  camera_model: string;
  storage_class: 'all' | 'Standard' | 'IA';
  sort_by: PhotoSearchParams['sort_by'];
  sort_order: PhotoSearchParams['sort_order'];
}

// File upload types
export interface FileUploadItem {
  file: File;
  id: string;
  progress: number;
  status: 'queued' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  photo_id?: string;
}

// Navigation types
export interface NavItem {
  path: string;
  label: string;
  icon?: string;
  badge?: number;
}

// Notification types
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Modal types
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// Loading states
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

// Error types
export interface AppError {
  message: string;
  code?: string;
  details?: any;
}

// EXIF data structure
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

// Theme types
export interface Theme {
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    background: string;
    surface: string;
    text: string;
  };
}

// Responsive breakpoints
export type Breakpoint = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

// Component props interfaces
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface ButtonProps extends BaseComponentProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps extends BaseComponentProps {
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}

export interface CardProps extends BaseComponentProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
