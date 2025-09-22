// Mock API for development without backend server
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  PhotoListResponse,
  PhotoSearchParams,
  Photo,
  UploadRequest,
  PresignedUrlResponse,
  UsageStats,
  CostDashboard,
  User,
} from '../types';

// Mock delay to simulate network requests
const delay = (ms: number = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Mock storage
let mockUsers: Array<{ id: string; email: string; password: string; created_at: string }> = [
  {
    id: 'user-1',
    email: 'demo@example.com',
    password: 'password123', // In real app, this would be hashed
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-2', 
    email: 'test@factory.com',
    password: 'test123456',
    created_at: '2024-01-15T00:00:00Z',
  }
];

let mockPhotos: Photo[] = [
  {
    id: 'photo-1',
    filename: 'sunset-beach.jpg',
    file_size: 2048576,
    content_type: 'image/jpeg',
    upload_date: '2024-09-20T10:30:00Z',
    storage_class: 'Standard',
    exif_data: {
      date_taken: '2024-09-20T18:25:00Z',
      camera_model: 'iPhone 15 Pro',
      gps: { lat: 35.6762, lng: 139.6503 }
    },
    date_taken: '2024-09-20T18:25:00Z',
    camera_model: 'iPhone 15 Pro',
    gps_lat: 35.6762,
    gps_lng: 139.6503,
    view_count: 5,
    original_access_count: 2,
    thumb_url: 'https://picsum.photos/200/200?random=1',
    medium_url: 'https://picsum.photos/800/600?random=1',
  },
  {
    id: 'photo-2',
    filename: 'mountain-view.jpg',
    file_size: 3145728,
    content_type: 'image/jpeg',
    upload_date: '2024-09-19T14:15:00Z',
    storage_class: 'Standard',
    exif_data: {
      date_taken: '2024-09-19T09:45:00Z',
      camera_model: 'Canon EOS R5'
    },
    date_taken: '2024-09-19T09:45:00Z',
    camera_model: 'Canon EOS R5',
    view_count: 12,
    original_access_count: 1,
    thumb_url: 'https://picsum.photos/200/200?random=2',
    medium_url: 'https://picsum.photos/800/600?random=2',
  },
  {
    id: 'photo-3',
    filename: 'city-night.jpg',
    file_size: 1572864,
    content_type: 'image/jpeg',
    upload_date: '2024-09-18T20:00:00Z',
    storage_class: 'IA',
    ia_transition_date: '2024-09-25T20:00:00Z',
    exif_data: {
      date_taken: '2024-09-18T21:30:00Z',
      camera_model: 'Sony α7R V'
    },
    date_taken: '2024-09-18T21:30:00Z',
    camera_model: 'Sony α7R V',
    view_count: 3,
    original_access_count: 0,
    thumb_url: 'https://picsum.photos/200/200?random=3',
    medium_url: 'https://picsum.photos/800/600?random=3',
  },
  {
    id: 'photo-4',
    filename: 'forest-hiking.jpg',
    file_size: 4194304,
    content_type: 'image/jpeg',
    upload_date: '2024-09-15T08:45:00Z',
    storage_class: 'Standard',
    exif_data: {
      date_taken: '2024-09-15T08:30:00Z',
      camera_model: 'Nikon D850'
    },
    date_taken: '2024-09-15T08:30:00Z',
    camera_model: 'Nikon D850',
    gps_lat: 36.5583,
    gps_lng: 138.9133,
    view_count: 8,
    original_access_count: 3,
    thumb_url: 'https://picsum.photos/200/200?random=4',
    medium_url: 'https://picsum.photos/800/600?random=4',
  },
  {
    id: 'photo-5',
    filename: 'coffee-shop.jpg',
    file_size: 1048576,
    content_type: 'image/jpeg',
    upload_date: '2024-09-10T15:20:00Z',
    storage_class: 'IA',
    ia_transition_date: '2024-09-20T15:20:00Z',
    exif_data: {
      date_taken: '2024-09-10T15:15:00Z',
      camera_model: 'iPhone 14 Pro'
    },
    date_taken: '2024-09-10T15:15:00Z',
    camera_model: 'iPhone 14 Pro',
    view_count: 2,
    original_access_count: 0,
    thumb_url: 'https://picsum.photos/200/200?random=5',
    medium_url: 'https://picsum.photos/800/600?random=5',
  },
  {
    id: 'photo-6',
    filename: 'festival-fireworks.jpg',
    file_size: 5242880,
    content_type: 'image/jpeg',
    upload_date: '2024-09-05T21:30:00Z',
    storage_class: 'Standard',
    exif_data: {
      date_taken: '2024-09-05T21:25:00Z',
      camera_model: 'Sony α7 IV'
    },
    date_taken: '2024-09-05T21:25:00Z',
    camera_model: 'Sony α7 IV',
    view_count: 15,
    original_access_count: 4,
    thumb_url: 'https://picsum.photos/200/200?random=6',
    medium_url: 'https://picsum.photos/800/600?random=6',
  },
  {
    id: 'photo-7',
    filename: 'family-picnic.jpg',
    file_size: 2621440,
    content_type: 'image/jpeg',
    upload_date: '2024-08-28T12:00:00Z',
    storage_class: 'IA',
    ia_transition_date: '2024-09-05T12:00:00Z',
    exif_data: {
      date_taken: '2024-08-28T11:45:00Z',
      camera_model: 'Canon EOS R6'
    },
    date_taken: '2024-08-28T11:45:00Z',
    camera_model: 'Canon EOS R6',
    gps_lat: 35.6895,
    gps_lng: 139.6917,
    view_count: 6,
    original_access_count: 1,
    thumb_url: 'https://picsum.photos/200/200?random=7',
    medium_url: 'https://picsum.photos/800/600?random=7',
  },
  {
    id: 'photo-8',
    filename: 'tokyo-skyline.jpg',
    file_size: 6291456,
    content_type: 'image/jpeg',
    upload_date: '2024-08-20T19:45:00Z',
    storage_class: 'Standard',
    exif_data: {
      date_taken: '2024-08-20T19:30:00Z',
      camera_model: 'Fujifilm X-T5'
    },
    date_taken: '2024-08-20T19:30:00Z',
    camera_model: 'Fujifilm X-T5',
    gps_lat: 35.6762,
    gps_lng: 139.6503,
    view_count: 20,
    original_access_count: 8,
    thumb_url: 'https://picsum.photos/200/200?random=8',
    medium_url: 'https://picsum.photos/800/600?random=8',
  },
  {
    id: 'photo-9',
    filename: 'cherry-blossoms.jpg',
    file_size: 3670016,
    content_type: 'image/jpeg',
    upload_date: '2024-04-05T10:15:00Z',
    storage_class: 'IA',
    ia_transition_date: '2024-05-05T10:15:00Z',
    exif_data: {
      date_taken: '2024-04-05T10:00:00Z',
      camera_model: 'iPhone 15 Pro Max'
    },
    date_taken: '2024-04-05T10:00:00Z',
    camera_model: 'iPhone 15 Pro Max',
    gps_lat: 35.7148,
    gps_lng: 139.7967,
    view_count: 25,
    original_access_count: 10,
    thumb_url: 'https://picsum.photos/200/200?random=9',
    medium_url: 'https://picsum.photos/800/600?random=9',
  },
  {
    id: 'photo-10',
    filename: 'winter-landscape.jpg',
    file_size: 4456448,
    content_type: 'image/jpeg',
    upload_date: '2024-01-15T13:20:00Z',
    storage_class: 'IA',
    ia_transition_date: '2024-02-14T13:20:00Z',
    exif_data: {
      date_taken: '2024-01-15T13:10:00Z',
      camera_model: 'Canon EOS R5'
    },
    date_taken: '2024-01-15T13:10:00Z',
    camera_model: 'Canon EOS R5',
    gps_lat: 36.7372,
    gps_lng: 137.9841,
    view_count: 7,
    original_access_count: 2,
    thumb_url: 'https://picsum.photos/200/200?random=10',
    medium_url: 'https://picsum.photos/800/600?random=10',
  },
];

let currentUser: User | null = null;

// Generate mock JWT-like token
const generateMockToken = (payload: any): string => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadStr = btoa(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  }));
  const signature = btoa('mock-signature');
  return `${header}.${payloadStr}.${signature}`;
};

export class MockApiClient {
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    await delay();
    
    const user = mockUsers.find(u => 
      u.email === credentials.email && u.password === credentials.password
    );
    
    if (!user) {
      throw new Error('メールアドレスまたはパスワードが正しくありません');
    }
    
    currentUser = {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
    };
    
    const accessToken = generateMockToken({ sub: user.id, email: user.email });
    const refreshToken = generateMockToken({ sub: user.id, email: user.email, type: 'refresh' });
    
    // Store in localStorage
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      user: currentUser,
    };
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    await delay();
    
    // Check if user already exists
    const existingUser = mockUsers.find(u => u.email === userData.email);
    if (existingUser) {
      throw new Error('このメールアドレスは既に使用されています');
    }
    
    const newUser = {
      id: `user-${Date.now()}`,
      email: userData.email,
      password: userData.password,
      created_at: new Date().toISOString(),
    };
    
    mockUsers.push(newUser);
    
    currentUser = {
      id: newUser.id,
      email: newUser.email,
      created_at: newUser.created_at,
    };
    
    const accessToken = generateMockToken({ sub: newUser.id, email: newUser.email });
    const refreshToken = generateMockToken({ sub: newUser.id, email: newUser.email, type: 'refresh' });
    
    // Store in localStorage
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      user: currentUser,
    };
  }

  async logout(): Promise<void> {
    await delay(200);
    currentUser = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  async getCurrentUser(): Promise<User> {
    await delay(300);
    
    if (!currentUser) {
      // Try to restore from localStorage
      const token = localStorage.getItem('access_token');
      if (token) {
        // In a real app, we'd validate the token
        // For mock, we'll just return the first user
        currentUser = {
          id: 'user-1',
          email: 'demo@example.com',
          created_at: '2024-01-01T00:00:00Z',
        };
        return currentUser;
      }
      throw new Error('Not authenticated');
    }
    
    return currentUser;
  }

  async getPhotos(params: PhotoSearchParams = {}): Promise<PhotoListResponse> {
    await delay();
    
    let filteredPhotos = [...mockPhotos];
    
    // Apply search filter
    if (params.search) {
      filteredPhotos = filteredPhotos.filter(photo =>
        photo.filename.toLowerCase().includes(params.search!.toLowerCase())
      );
    }
    
    // Apply date filter
    if (params.date_from) {
      filteredPhotos = filteredPhotos.filter(photo =>
        photo.upload_date >= params.date_from!
      );
    }
    
    if (params.date_to) {
      filteredPhotos = filteredPhotos.filter(photo =>
        photo.upload_date <= params.date_to!
      );
    }
    
    // Apply storage class filter
    if (params.storage_class) {
      filteredPhotos = filteredPhotos.filter(photo =>
        photo.storage_class === params.storage_class
      );
    }
    
    // Apply sorting
    const sortBy = params.sort_by || 'upload_date';
    const sortOrder = params.sort_order || 'desc';
    
    filteredPhotos.sort((a, b) => {
      let aValue: any = a[sortBy as keyof Photo];
      let bValue: any = b[sortBy as keyof Photo];
      
      if (sortBy === 'file_size') {
        aValue = Number(aValue);
        bValue = Number(bValue);
      }
      
      if (sortOrder === 'desc') {
        return aValue > bValue ? -1 : 1;
      } else {
        return aValue < bValue ? -1 : 1;
      }
    });
    
    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 50;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedPhotos = filteredPhotos.slice(startIndex, endIndex);
    
    return {
      photos: paginatedPhotos,
      pagination: {
        current_page: page,
        total_pages: Math.ceil(filteredPhotos.length / limit),
        total_count: filteredPhotos.length,
        has_next: endIndex < filteredPhotos.length,
        has_prev: page > 1,
      },
    };
  }

  async getPhoto(id: string): Promise<Photo> {
    await delay();
    
    const photo = mockPhotos.find(p => p.id === id);
    if (!photo) {
      throw new Error('Photo not found');
    }
    
    return photo;
  }

  async getUsageStats(): Promise<UsageStats> {
    await delay();
    
    const totalSize = mockPhotos.reduce((acc, photo) => acc + photo.file_size, 0);
    const standardPhotos = mockPhotos.filter(p => p.storage_class === 'Standard');
    const iaPhotos = mockPhotos.filter(p => p.storage_class === 'IA');
    
    const standardSize = standardPhotos.reduce((acc, photo) => acc + photo.file_size, 0);
    const iaSize = iaPhotos.reduce((acc, photo) => acc + photo.file_size, 0);
    
    const totalGB = totalSize / (1024 ** 3);
    const standardGB = standardSize / (1024 ** 3);
    const iaGB = iaSize / (1024 ** 3);
    
    return {
      storage: {
        total_gb: totalGB,
        standard_gb: standardGB,
        ia_gb: iaGB,
        file_count: mockPhotos.length,
        free_quota_remaining: Math.max(0, 10 - totalGB),
      },
      monthly_stats: {
        uploads: 15,
        original_accesses: 8,
        cost_incurred_usd: 0.12,
      },
      monthly_cost: {
        storage_usd: totalGB * 0.015,
        total_usd: (totalGB * 0.015) + 0.12,
      },
      file_types: [
        { content_type: 'image/jpeg', count: 3, total_size: totalSize },
      ],
      quota_percentage: (totalGB / 10) * 100,
    };
  }

  async getCostDashboard(): Promise<CostDashboard> {
    await delay();
    
    const usageStats = await this.getUsageStats();
    
    return {
      storage: usageStats.storage,
      monthly_cost: {
        storage_standard: usageStats.storage.standard_gb * 0.015,
        storage_ia: usageStats.storage.ia_gb * 0.01,
        operations_class_a: 0.005,
        operations_class_b: 0.002,
        ia_retrievals: 0.12,
        total_usd: usageStats.monthly_cost.total_usd,
      },
      projection: {
        month_end_total_usd: usageStats.monthly_cost.total_usd * 1.2,
        cost_alerts: [],
      },
    };
  }

  async getPresignedUploadUrl(uploadRequest: UploadRequest): Promise<PresignedUrlResponse> {
    await delay();
    
    const photoId = `photo-${Date.now()}`;
    
    return {
      upload_url: `https://mock-upload-url.com/${photoId}`,
      photo_id: photoId,
      expires_at: new Date(Date.now() + 3600000).toISOString(),
      quota_warning: uploadRequest.file_size > 100 * 1024 * 1024 ? '大きなファイルです' : undefined,
    };
  }

  async uploadFile(presignedUrl: string, file: File, onProgress?: (progress: number) => void): Promise<string> {
    // Simulate upload progress
    for (let i = 0; i <= 100; i += 10) {
      await delay(100);
      if (onProgress) {
        onProgress(i);
      }
    }
    
    return 'mock-etag-' + Date.now();
  }

  async completeUpload(photoId: string, etag: string, actualSize: number): Promise<void> {
    await delay();
    
    // Add to mock photos
    const newPhoto: Photo = {
      id: photoId,
      filename: `uploaded-${Date.now()}.jpg`,
      file_size: actualSize,
      content_type: 'image/jpeg',
      upload_date: new Date().toISOString(),
      storage_class: 'Standard',
      view_count: 0,
      original_access_count: 0,
      thumb_url: `https://picsum.photos/200/200?random=${Date.now()}`,
      medium_url: `https://picsum.photos/800/600?random=${Date.now()}`,
    };
    
    mockPhotos.unshift(newPhoto);
  }

  // Utility method to check if using mock API
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token');
  }
}

// Export mock instance
export const mockApiClient = new MockApiClient();
