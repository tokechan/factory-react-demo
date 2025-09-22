import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { 
  Env, 
  Photo, 
  PhotoListResponse, 
  PhotoDetailResponse, 
  PhotoSearchParams,
  APIResponse,
  AccessLogRecord 
} from '../types';
import { APIError } from '../types';
import { authMiddleware } from '../middleware/auth';
import { 
  generatePresignedDownloadUrl, 
  calculateIARetrievalCost,
  getCurrentStorageUsage 
} from '../utils/storage';

const photos = new Hono<{ Bindings: Env }>();

// Validation schemas
const searchParamsSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().min(1)).optional().default('1'),
  limit: z.string().transform(Number).pipe(z.number().min(1).max(100)).optional().default('50'),
  sort_by: z.enum(['upload_date', 'date_taken', 'file_size', 'filename']).optional().default('upload_date'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  camera_model: z.string().optional(),
  storage_class: z.enum(['Standard', 'IA']).optional(),
  search: z.string().optional(),
});

const updateMetadataSchema = z.object({
  filename: z.string().min(1).optional(),
  exif_data: z.record(z.any()).optional(),
});

/**
 * GET /photos - List photos with pagination and search
 */
photos.get('/', authMiddleware, zValidator('query', searchParamsSchema), async (c) => {
  try {
    const user = c.get('user');
    const params = c.req.valid('query') as PhotoSearchParams;
    
    // Build cache key
    const cacheKey = `photo_list:page_${params.page}:sort_${params.sort_by}_${params.sort_order}:user_${user.sub}`;
    
    // Try to get from cache first
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached && !params.search && !params.date_from) { // Don't cache search results
      return c.json(JSON.parse(cached));
    }
    
    // Build SQL query
    let sql = `
      SELECT 
        id, filename, original_key, thumb_key, medium_key,
        file_size, content_type, upload_date, storage_class,
        ia_transition_date, exif_data, date_taken, camera_model,
        gps_lat, gps_lng, view_count, last_accessed, original_access_count
      FROM photos 
      WHERE user_id = ? AND upload_completed = 1
    `;
    
    const queryParams: any[] = [user.sub];
    
    // Add search filters
    if (params.search) {
      sql += ' AND filename LIKE ?';
      queryParams.push(`%${params.search}%`);
    }
    
    if (params.date_from) {
      sql += ' AND (date_taken >= ? OR upload_date >= ?)';
      queryParams.push(params.date_from, params.date_from);
    }
    
    if (params.date_to) {
      sql += ' AND (date_taken <= ? OR upload_date <= ?)';
      queryParams.push(params.date_to, params.date_to);
    }
    
    if (params.camera_model) {
      sql += ' AND camera_model = ?';
      queryParams.push(params.camera_model);
    }
    
    if (params.storage_class) {
      sql += ' AND storage_class = ?';
      queryParams.push(params.storage_class);
    }
    
    // Add sorting
    const sortColumn = params.sort_by === 'date_taken' && params.sort_by 
      ? 'COALESCE(date_taken, upload_date)' 
      : params.sort_by;
    sql += ` ORDER BY ${sortColumn} ${params.sort_order?.toUpperCase()}`;
    
    // Get total count for pagination
    const countSql = sql.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
    const countResult = await c.env.DB.prepare(countSql).bind(...queryParams).first<{ total: number }>();
    const totalCount = countResult?.total || 0;
    
    // Add pagination
    const offset = ((params.page || 1) - 1) * (params.limit || 50);
    sql += ` LIMIT ? OFFSET ?`;
    queryParams.push(params.limit || 50, offset);
    
    // Execute query
    const result = await c.env.DB.prepare(sql).bind(...queryParams).all();
    const photos = result.results as Photo[];
    
    // Generate thumbnail URLs for each photo
    const photosWithUrls = await Promise.all(
      photos.map(async (photo) => {
        let thumbUrl: string | undefined;
        let mediumUrl: string | undefined;
        
        if (photo.thumb_key) {
          thumbUrl = await generatePresignedDownloadUrl(c.env, photo.thumb_key, 3600);
        }
        
        if (photo.medium_key) {
          mediumUrl = await generatePresignedDownloadUrl(c.env, photo.medium_key, 3600);
        }
        
        return {
          ...photo,
          thumb_url: thumbUrl,
          medium_url: mediumUrl,
          exif_data: photo.exif_data ? JSON.parse(photo.exif_data as string) : undefined,
        };
      })
    );
    
    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / (params.limit || 50));
    const currentPage = params.page || 1;
    
    const response: APIResponse<PhotoListResponse> = {
      success: true,
      data: {
        photos: photosWithUrls,
        pagination: {
          current_page: currentPage,
          total_pages: totalPages,
          total_count: totalCount,
          has_next: currentPage < totalPages,
          has_prev: currentPage > 1,
        },
      },
    };
    
    // Cache the result for 30 minutes if no search params
    if (!params.search && !params.date_from) {
      await c.env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 1800 });
    }
    
    return c.json(response);
  } catch (error) {
    console.error('Photos list error:', error);
    throw new APIError(500, 'Failed to retrieve photos');
  }
});

/**
 * GET /photos/:id - Get photo details
 */
photos.get('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const photoId = c.req.param('id');
    
    if (!photoId) {
      throw new APIError(400, 'Photo ID is required');
    }
    
    // Get photo from database
    const photo = await c.env.DB.prepare(`
      SELECT 
        id, filename, original_key, thumb_key, medium_key,
        file_size, content_type, upload_date, storage_class,
        ia_transition_date, exif_data, date_taken, camera_model,
        gps_lat, gps_lng, view_count, last_accessed, original_access_count
      FROM photos 
      WHERE id = ? AND user_id = ? AND upload_completed = 1
    `).bind(photoId, user.sub).first<Photo>();
    
    if (!photo) {
      throw new APIError(404, 'Photo not found or access denied');
    }
    
    // Generate URLs for different sizes
    const thumbUrl = photo.thumb_key 
      ? await generatePresignedDownloadUrl(c.env, photo.thumb_key, 3600)
      : undefined;
    
    const mediumUrl = photo.medium_key
      ? await generatePresignedDownloadUrl(c.env, photo.medium_key, 3600)
      : undefined;
    
    // Update view count
    await c.env.DB.prepare(`
      UPDATE photos 
      SET view_count = view_count + 1, last_accessed = datetime('now')
      WHERE id = ?
    `).bind(photoId).run();
    
    // Log access
    await c.env.DB.prepare(`
      INSERT INTO access_logs (photo_id, access_type, accessed_at, cost_incurred_usd)
      VALUES (?, 'medium', datetime('now'), 0)
    `).bind(photoId).run();
    
    const photoDetail: PhotoDetailResponse = {
      ...photo,
      thumb_url: thumbUrl,
      medium_url: mediumUrl,
      exif_data: photo.exif_data ? JSON.parse(photo.exif_data as string) : undefined,
    };
    
    const response: APIResponse<PhotoDetailResponse> = {
      success: true,
      data: photoDetail,
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Photo detail error:', error);
    throw new APIError(500, 'Failed to retrieve photo details');
  }
});

/**
 * GET /photos/:id/original-url - Get original photo URL with cost warning
 */
photos.get('/:id/original-url', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const photoId = c.req.param('id');
    
    if (!photoId) {
      throw new APIError(400, 'Photo ID is required');
    }
    
    // Get photo info
    const photo = await c.env.DB.prepare(`
      SELECT 
        id, filename, original_key, file_size, storage_class,
        original_access_count
      FROM photos 
      WHERE id = ? AND user_id = ? AND upload_completed = 1
    `).bind(photoId, user.sub).first<{
      id: string;
      filename: string;
      original_key: string;
      file_size: number;
      storage_class: string;
      original_access_count: number;
    }>();
    
    if (!photo) {
      throw new APIError(404, 'Photo not found or access denied');
    }
    
    // Calculate cost if IA storage
    let costWarning: string | undefined;
    let costUSD = 0;
    
    if (photo.storage_class === 'IA') {
      costUSD = calculateIARetrievalCost(photo.file_size);
      
      // Get monthly access count
      const monthlyAccess = await c.env.DB.prepare(`
        SELECT COUNT(*) as count
        FROM access_logs 
        WHERE photo_id = ? 
          AND access_type = 'original' 
          AND accessed_at >= date('now', 'start of month')
      `).bind(photoId).first<{ count: number }>();
      
      costWarning = `IA取得料金 $${costUSD.toFixed(4)} が発生します。今月${monthlyAccess?.count || 0}回アクセス済み。`;
    }
    
    // Generate presigned URL
    const originalUrl = await generatePresignedDownloadUrl(c.env, photo.original_key, 3600);
    
    // Update access count and log
    await c.env.DB.prepare(`
      UPDATE photos 
      SET original_access_count = original_access_count + 1, last_accessed = datetime('now')
      WHERE id = ?
    `).bind(photoId).run();
    
    await c.env.DB.prepare(`
      INSERT INTO access_logs (photo_id, access_type, accessed_at, cost_incurred_usd)
      VALUES (?, 'original', datetime('now'), ?)
    `).bind(photoId, costUSD).run();
    
    const response: APIResponse = {
      success: true,
      data: {
        original_url: originalUrl,
        filename: photo.filename,
        file_size: photo.file_size,
        storage_class: photo.storage_class,
        cost_warning: costWarning,
        cost_usd: costUSD,
        expires_at: new Date(Date.now() + 3600000).toISOString(),
      },
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Original URL error:', error);
    throw new APIError(500, 'Failed to generate original photo URL');
  }
});

/**
 * PUT /photos/:id/metadata - Update photo metadata
 */
photos.put('/:id/metadata', authMiddleware, zValidator('json', updateMetadataSchema), async (c) => {
  try {
    const user = c.get('user');
    const photoId = c.req.param('id');
    const { filename, exif_data } = c.req.valid('json');
    
    if (!photoId) {
      throw new APIError(400, 'Photo ID is required');
    }
    
    // Check if photo exists and belongs to user
    const existing = await c.env.DB.prepare(`
      SELECT id FROM photos WHERE id = ? AND user_id = ?
    `).bind(photoId, user.sub).first();
    
    if (!existing) {
      throw new APIError(404, 'Photo not found or access denied');
    }
    
    // Build update query
    const updates: string[] = [];
    const params: any[] = [];
    
    if (filename) {
      updates.push('filename = ?');
      params.push(filename);
    }
    
    if (exif_data) {
      updates.push('exif_data = ?');
      params.push(JSON.stringify(exif_data));
      
      // Extract searchable fields from EXIF
      if (exif_data.date_taken) {
        updates.push('date_taken = ?');
        params.push(exif_data.date_taken);
      }
      
      if (exif_data.camera_model) {
        updates.push('camera_model = ?');
        params.push(exif_data.camera_model);
      }
      
      if (exif_data.gps?.lat && exif_data.gps?.lng) {
        updates.push('gps_lat = ?, gps_lng = ?');
        params.push(exif_data.gps.lat, exif_data.gps.lng);
      }
    }
    
    if (updates.length === 0) {
      throw new APIError(400, 'No valid fields to update');
    }
    
    // Add updated timestamp and photo ID
    updates.push('updated_at = datetime(\'now\')');
    params.push(photoId);
    
    const sql = `UPDATE photos SET ${updates.join(', ')} WHERE id = ?`;
    await c.env.DB.prepare(sql).bind(...params).run();
    
    // Clear cache
    await c.env.CACHE.delete(`photo_meta:${photoId}`);
    
    const response: APIResponse = {
      success: true,
      message: 'Photo metadata updated successfully',
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Metadata update error:', error);
    throw new APIError(500, 'Failed to update photo metadata');
  }
});

/**
 * DELETE /photos/:id - Delete photo and all variants
 */
photos.delete('/:id', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const photoId = c.req.param('id');
    
    if (!photoId) {
      throw new APIError(400, 'Photo ID is required');
    }
    
    // Get photo info
    const photo = await c.env.DB.prepare(`
      SELECT original_key, thumb_key, medium_key
      FROM photos 
      WHERE id = ? AND user_id = ?
    `).bind(photoId, user.sub).first<{
      original_key: string;
      thumb_key: string | null;
      medium_key: string | null;
    }>();
    
    if (!photo) {
      throw new APIError(404, 'Photo not found or access denied');
    }
    
    // Delete from R2 storage
    const deletePromises: Promise<any>[] = [
      c.env.PHOTO_BUCKET.delete(photo.original_key)
    ];
    
    if (photo.thumb_key) {
      deletePromises.push(c.env.PHOTO_BUCKET.delete(photo.thumb_key));
    }
    
    if (photo.medium_key) {
      deletePromises.push(c.env.PHOTO_BUCKET.delete(photo.medium_key));
    }
    
    // Delete from database
    deletePromises.push(
      c.env.DB.prepare('DELETE FROM photos WHERE id = ?').bind(photoId).run(),
      c.env.DB.prepare('DELETE FROM access_logs WHERE photo_id = ?').bind(photoId).run()
    );
    
    // Execute all deletions
    await Promise.all(deletePromises);
    
    // Clear cache
    await c.env.CACHE.delete(`photo_meta:${photoId}`);
    
    const response: APIResponse = {
      success: true,
      message: 'Photo deleted successfully',
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('Photo deletion error:', error);
    throw new APIError(500, 'Failed to delete photo');
  }
});

export default photos;
