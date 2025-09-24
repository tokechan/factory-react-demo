import axios, { AxiosInstance } from 'axios';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  APIResponse,
  PhotoListResponse,
  PhotoSearchParams,
  Photo,
  UploadRequest,
  PresignedUrlResponse,
  UsageStats,
  CostDashboard,
  User,
} from '../types';
import { mockApiClient } from './mockApi';

// API Configuration
const envApiUrl = process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL;
const fallbackApiUrl = typeof window !== 'undefined' ? `${window.location.origin}/api` : 'http://localhost:8787';
const API_BASE_URL = envApiUrl || fallbackApiUrl;
const USE_MOCK_API = process.env.REACT_APP_USE_MOCK_API === 'true' || (!process.env.REACT_APP_API_URL && !process.env.REACT_APP_API_BASE_URL);

class ApiClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load tokens from localStorage
    this.loadTokensFromStorage();

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            await this.refreshAccessToken();
            originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private loadTokensFromStorage(): void {
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  private saveTokensToStorage(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  // Authentication methods
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    if (USE_MOCK_API) {
      const authData = await mockApiClient.login(credentials);
      this.saveTokensToStorage(authData.access_token, authData.refresh_token);
      return authData;
    }

    const response = await this.client.post<APIResponse<AuthResponse>>('/api/auth/login', credentials);
    
    if (response.data.success && response.data.data) {
      const authData = response.data.data;
      this.saveTokensToStorage(authData.access_token, authData.refresh_token);
      return authData;
    }
    
    throw new Error(response.data.error || 'Login failed');
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    if (USE_MOCK_API) {
      const authData = await mockApiClient.register(userData);
      this.saveTokensToStorage(authData.access_token, authData.refresh_token);
      return authData;
    }

    const response = await this.client.post<APIResponse<AuthResponse>>('/api/auth/register', userData);
    
    if (response.data.success && response.data.data) {
      const authData = response.data.data;
      this.saveTokensToStorage(authData.access_token, authData.refresh_token);
      return authData;
    }
    
    throw new Error(response.data.error || 'Registration failed');
  }

  async logout(): Promise<void> {
    if (USE_MOCK_API) {
      await mockApiClient.logout();
      this.clearTokens();
      return;
    }

    try {
      await this.client.post('/api/auth/logout');
    } finally {
      this.clearTokens();
    }
  }

  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.client.post<APIResponse<{ access_token: string; expires_in: number }>>('/api/auth/refresh', {
      refresh_token: this.refreshToken,
    });

    if (response.data.success && response.data.data) {
      this.accessToken = response.data.data.access_token;
      localStorage.setItem('access_token', this.accessToken);
    } else {
      throw new Error('Token refresh failed');
    }
  }

  async getCurrentUser(): Promise<User> {
    if (USE_MOCK_API) {
      return await mockApiClient.getCurrentUser();
    }

    const response = await this.client.get<APIResponse<User>>('/api/auth/me');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get user info');
  }

  // Photo management methods
  async getPhotos(params: PhotoSearchParams = {}): Promise<PhotoListResponse> {
    if (USE_MOCK_API) {
      return await mockApiClient.getPhotos(params);
    }

    const response = await this.client.get<APIResponse<PhotoListResponse>>('/api/photos', { params });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch photos');
  }

  async getPhoto(id: string): Promise<Photo> {
    const response = await this.client.get<APIResponse<Photo>>(`/api/photos/${id}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch photo');
  }

  async getOriginalPhotoUrl(id: string): Promise<{
    original_url: string;
    filename: string;
    file_size: number;
    storage_class: string;
    cost_warning?: string;
    cost_usd: number;
    expires_at: string;
  }> {
    const response = await this.client.get<APIResponse<any>>(`/api/photos/${id}/original-url`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get original photo URL');
  }

  async deletePhoto(id: string): Promise<void> {
    const response = await this.client.delete<APIResponse>(`/api/photos/${id}`);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to delete photo');
    }
  }

  async updatePhotoMetadata(id: string, metadata: Partial<Pick<Photo, 'filename' | 'exif_data'>>): Promise<void> {
    const response = await this.client.put<APIResponse>(`/api/photos/${id}/metadata`, metadata);
    
    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to update photo metadata');
    }
  }

  // Upload methods
  async getPresignedUploadUrl(uploadRequest: UploadRequest): Promise<PresignedUrlResponse> {
    if (USE_MOCK_API) {
      return await mockApiClient.getPresignedUploadUrl(uploadRequest);
    }

    const response = await this.client.post<APIResponse<PresignedUrlResponse>>('/api/upload/presign', uploadRequest);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get upload URL');
  }

  async uploadFile(presignedUrl: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
    if (USE_MOCK_API) {
      return await mockApiClient.uploadFile(presignedUrl, file, onProgress);
    }

    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.put(presignedUrl, file, {
      headers: {
        'Content-Type': file.type,
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.headers.etag || '';
  }

  async completeUpload(photoId: string, etag: string, actualSize: number): Promise<void> {
    if (USE_MOCK_API) {
      return await mockApiClient.completeUpload(photoId, etag, actualSize);
    }

    const response = await this.client.post<APIResponse>('/api/upload/complete', {
      photo_id: photoId,
      etag,
      actual_size: actualSize,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to complete upload');
    }
  }

  async getUploadStatus(photoId: string): Promise<{
    photo_id: string;
    upload_completed: boolean;
    completed_at?: string;
    processing_status?: any;
  }> {
    const response = await this.client.get<APIResponse<any>>(`/api/upload/status/${photoId}`);
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to get upload status');
  }

  // Statistics methods
  async getUsageStats(): Promise<UsageStats> {
    if (USE_MOCK_API) {
      return await mockApiClient.getUsageStats();
    }

    const response = await this.client.get<APIResponse<UsageStats>>('/api/stats/usage');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch usage statistics');
  }

  async getCostDashboard(): Promise<CostDashboard> {
    if (USE_MOCK_API) {
      return await mockApiClient.getCostDashboard();
    }

    const response = await this.client.get<APIResponse<CostDashboard>>('/api/stats/cost');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch cost dashboard');
  }

  async getUsageHistory(days: number = 30): Promise<{
    period_days: number;
    upload_history: any[];
    access_history: any[];
  }> {
    const response = await this.client.get<APIResponse<any>>('/api/stats/history', {
      params: { days },
    });
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.error || 'Failed to fetch usage history');
  }

  // Utility methods
  isAuthenticated(): boolean {
    if (USE_MOCK_API) {
      return mockApiClient.isAuthenticated();
    }
    return !!this.accessToken;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    const response = await this.client.get<any>('/health');
    return response.data;
  }

  // Configuration
  async getConfig(): Promise<{
    max_file_size: number;
    supported_formats: string[];
    upload_limits: any;
    storage_limits: any;
    features: any;
  }> {
    const response = await this.client.get<APIResponse<any>>('/api/config');
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error('Failed to fetch configuration');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount < 0.01 ? 4 : 2,
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString));
};

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}秒前`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}時間前`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}日前`;
  
  return formatDate(dateString);
};
