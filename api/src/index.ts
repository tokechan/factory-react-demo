import { Hono } from 'hono';
import type { Env } from './types';
import { corsMiddleware, securityHeadersMiddleware } from './middleware/cors';
import { errorHandler, notFoundHandler } from './middleware/error';

// Import route handlers
import auth from './routes/auth';
import upload from './routes/upload';
import photos from './routes/photos';
import stats from './routes/stats';

// Create main Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', corsMiddleware);
app.use('*', securityHeadersMiddleware);

// Health check endpoint
app.get('/', (c) => {
  return c.json({
    success: true,
    message: 'Photo Archive API is running',
    version: '1.0.0',
    environment: c.env?.ENVIRONMENT || 'development',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (c) => {
  return c.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected', // TODO: Add actual health checks
      storage: 'connected',
      cache: 'connected',
    },
  });
});

// API routes
app.route('/api/auth', auth);
app.route('/api/upload', upload);
app.route('/api/photos', photos);
app.route('/api/stats', stats);

// Additional utility endpoints

/**
 * GET /api/config - Get client configuration
 */
app.get('/api/config', (c) => {
  return c.json({
    success: true,
    data: {
      max_file_size: 5 * 1024 * 1024 * 1024, // 5GB
      supported_formats: [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
      ],
      upload_limits: {
        single_file_max: 5 * 1024 * 1024 * 1024, // 5GB
        multipart_threshold: 100 * 1024 * 1024, // 100MB
        concurrent_uploads: 3,
      },
      storage_limits: {
        free_quota_gb: 10,
        warning_threshold: 0.8, // 80%
        critical_threshold: 0.95, // 95%
      },
      features: {
        multipart_upload: true,
        thumbnail_generation: true,
        exif_extraction: true,
        lifecycle_management: true,
        cost_tracking: true,
      },
    },
  });
});

/**
 * POST /api/process/variants/:id - Trigger manual variant generation
 * This would typically be called by a background job/queue system
 */
app.post('/api/process/variants/:id', async (c) => {
  try {
    const photoId = c.req.param('id');
    
    if (!photoId) {
      return c.json({ success: false, error: 'Photo ID required' }, 400);
    }
    
    // Get photo info
    const photo = await c.env.DB.prepare(`
      SELECT id, original_key, filename, content_type
      FROM photos 
      WHERE id = ? AND upload_completed = 1
    `).bind(photoId).first<{
      id: string;
      original_key: string;
      filename: string;
      content_type: string;
    }>();
    
    if (!photo) {
      return c.json({ success: false, error: 'Photo not found' }, 404);
    }
    
    // TODO: Implement actual image processing
    // This would use Cloudflare Images, Sharp in a Worker, or external service
    // For now, we'll just simulate the process
    
    // Simulate thumbnail and medium generation
    const thumbKey = photo.original_key.replace('original/', 'thumb/');
    const mediumKey = photo.original_key.replace('original/', 'medium/');
    
    // Update photo record with variant keys
    await c.env.DB.prepare(`
      UPDATE photos 
      SET thumb_key = ?, medium_key = ?, variants_generated = 1
      WHERE id = ?
    `).bind(thumbKey, mediumKey, photoId).run();
    
    // Update processing status
    await c.env.CACHE.put(
      `processing:${photoId}`,
      JSON.stringify({
        photo_id: photoId,
        status: 'completed',
        progress: 100,
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        variants_generated: {
          thumbnail: true,
          medium: true,
        },
      }),
      { expirationTtl: 86400 }
    );
    
    return c.json({
      success: true,
      data: {
        photo_id: photoId,
        status: 'completed',
        variants: {
          thumbnail: thumbKey,
          medium: mediumKey,
        },
      },
    });
  } catch (error) {
    console.error('Variant processing error:', error);
    return c.json({ success: false, error: 'Processing failed' }, 500);
  }
});

// Error handling
app.onError(errorHandler);
app.notFound(notFoundHandler);

// Export for Cloudflare Workers
export default app;
