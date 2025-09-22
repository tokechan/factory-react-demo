import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { 
  Env, 
  CostDashboard, 
  UsageStats,
  Alert,
  APIResponse 
} from '../types';
import { APIError } from '../types';
import { authMiddleware } from '../middleware/auth';
import { 
  getCurrentStorageUsage, 
  calculateMonthlyCost,
  STORAGE_PRICING 
} from '../utils/storage';

const stats = new Hono<{ Bindings: Env }>();

// Validation schemas
const alertSettingsSchema = z.object({
  alert_type: z.enum(['storage_quota', 'cost_threshold']),
  threshold_value: z.number().positive(),
  is_enabled: z.boolean().optional().default(true),
});

/**
 * GET /stats/usage - Get current storage usage statistics
 */
stats.get('/usage', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    // Try cache first
    const cacheKey = `usage_stats:${user.sub}:${new Date().toISOString().split('T')[0]}`;
    const cached = await c.env.CACHE.get(cacheKey);
    
    if (cached) {
      return c.json(JSON.parse(cached));
    }
    
    // Get current usage
    const usage = await getCurrentStorageUsage(c.env);
    
    // Get monthly statistics
    const monthlyStats = await c.env.DB.prepare(`
      SELECT 
        COUNT(*) as uploads_this_month,
        COALESCE(SUM(CASE WHEN access_type = 'original' THEN 1 ELSE 0 END), 0) as original_accesses,
        COALESCE(SUM(cost_incurred_usd), 0) as total_cost_incurred
      FROM access_logs 
      WHERE accessed_at >= date('now', 'start of month')
        AND photo_id IN (SELECT id FROM photos WHERE user_id = ?)
    `).bind(user.sub).first<{
      uploads_this_month: number;
      original_accesses: number;
      total_cost_incurred: number;
    }>();
    
    // Get file type breakdown
    const fileTypeStats = await c.env.DB.prepare(`
      SELECT 
        content_type,
        COUNT(*) as count,
        COALESCE(SUM(file_size), 0) as total_size
      FROM photos 
      WHERE user_id = ? AND upload_completed = 1
      GROUP BY content_type
      ORDER BY count DESC
    `).bind(user.sub).all();
    
    // Calculate costs
    const monthlyCost = calculateMonthlyCost(usage.standardGB, usage.iaGB);
    
    const response: APIResponse = {
      success: true,
      data: {
        storage: {
          total_gb: usage.totalGB,
          standard_gb: usage.standardGB,
          ia_gb: usage.iaGB,
          file_count: usage.fileCount,
          free_quota_remaining: Math.max(0, STORAGE_PRICING.FREE_QUOTA_GB - usage.totalGB),
        },
        monthly_stats: {
          uploads: monthlyStats?.uploads_this_month || 0,
          original_accesses: monthlyStats?.original_accesses || 0,
          cost_incurred_usd: monthlyStats?.total_cost_incurred || 0,
        },
        monthly_cost: {
          storage_usd: monthlyCost,
          total_usd: monthlyCost + (monthlyStats?.total_cost_incurred || 0),
        },
        file_types: fileTypeStats.results,
        quota_percentage: (usage.totalGB / STORAGE_PRICING.FREE_QUOTA_GB) * 100,
      },
    };
    
    // Cache for 1 hour
    await c.env.CACHE.put(cacheKey, JSON.stringify(response), { expirationTtl: 3600 });
    
    return c.json(response);
  } catch (error) {
    console.error('Usage stats error:', error);
    throw new APIError(500, 'Failed to retrieve usage statistics');
  }
});

/**
 * GET /stats/cost - Get detailed cost breakdown and projections
 */
stats.get('/cost', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    // Get current usage
    const usage = await getCurrentStorageUsage(c.env);
    
    // Get this month's operations count
    const operationsStats = await c.env.DB.prepare(`
      SELECT 
        COALESCE(SUM(CASE WHEN access_type IN ('thumb', 'medium') THEN 1 ELSE 0 END), 0) as class_b_ops,
        COALESCE(SUM(CASE WHEN access_type = 'original' AND cost_incurred_usd > 0 THEN 1 ELSE 0 END), 0) as ia_retrievals,
        COALESCE(SUM(cost_incurred_usd), 0) as ia_retrieval_cost
      FROM access_logs 
      WHERE accessed_at >= date('now', 'start of month')
        AND photo_id IN (SELECT id FROM photos WHERE user_id = ?)
    `).bind(user.sub).first<{
      class_b_ops: number;
      ia_retrievals: number;
      ia_retrieval_cost: number;
    }>();
    
    // Calculate costs
    const storageCostStandard = usage.standardGB * STORAGE_PRICING.STANDARD;
    const storageCostIA = usage.iaGB * STORAGE_PRICING.IA;
    const operationsCostB = (operationsStats?.class_b_ops || 0) * STORAGE_PRICING.CLASS_B_OPS;
    const iaRetrievalCost = operationsStats?.ia_retrieval_cost || 0;
    
    const totalMonthlyCost = storageCostStandard + storageCostIA + operationsCostB + iaRetrievalCost;
    
    // Project end-of-month cost based on current usage pattern
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const currentDay = new Date().getDate();
    const projectionMultiplier = daysInMonth / currentDay;
    
    const projectedMonthlyCost = storageCostStandard + storageCostIA + 
      (operationsCostB + iaRetrievalCost) * projectionMultiplier;
    
    // Check for quota alerts
    const alerts: Alert[] = [];
    const quotaPercentage = (usage.totalGB / STORAGE_PRICING.FREE_QUOTA_GB) * 100;
    
    if (quotaPercentage >= 95) {
      alerts.push({
        type: 'quota_95',
        message: `ストレージ使用量が95%に達しました (${usage.totalGB.toFixed(2)}GB / ${STORAGE_PRICING.FREE_QUOTA_GB}GB)`,
        severity: 'critical',
        triggered_at: new Date().toISOString(),
      });
    } else if (quotaPercentage >= 80) {
      alerts.push({
        type: 'quota_80',
        message: `ストレージ使用量が80%に達しました (${usage.totalGB.toFixed(2)}GB / ${STORAGE_PRICING.FREE_QUOTA_GB}GB)`,
        severity: 'warning',
        triggered_at: new Date().toISOString(),
      });
    }
    
    if (projectedMonthlyCost > 5) {
      alerts.push({
        type: 'cost_threshold',
        message: `月次コストが$5を超える見込みです (予測: $${projectedMonthlyCost.toFixed(2)})`,
        severity: 'warning',
        triggered_at: new Date().toISOString(),
      });
    }
    
    const costDashboard: CostDashboard = {
      storage: {
        standard_gb: usage.standardGB,
        ia_gb: usage.iaGB,
        total_gb: usage.totalGB,
        free_quota_remaining: Math.max(0, STORAGE_PRICING.FREE_QUOTA_GB - usage.totalGB),
      },
      monthly_cost: {
        storage_standard: storageCostStandard,
        storage_ia: storageCostIA,
        operations_class_a: 0, // We don't track Class A operations in this simplified version
        operations_class_b: operationsCostB,
        ia_retrievals: iaRetrievalCost,
        total_usd: totalMonthlyCost,
      },
      projection: {
        month_end_total_usd: projectedMonthlyCost,
        quota_exhaustion_date: quotaPercentage > 0 
          ? new Date(Date.now() + ((100 - quotaPercentage) / quotaPercentage) * 30 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
        cost_alerts: alerts,
      },
    };
    
    const response: APIResponse<CostDashboard> = {
      success: true,
      data: costDashboard,
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Cost stats error:', error);
    throw new APIError(500, 'Failed to retrieve cost statistics');
  }
});

/**
 * GET /stats/history - Get historical usage data
 */
stats.get('/history', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const days = parseInt(c.req.query('days') || '30');
    
    if (days > 365) {
      throw new APIError(400, 'Maximum history period is 365 days');
    }
    
    // Get daily statistics for the specified period
    const historyStats = await c.env.DB.prepare(`
      SELECT 
        date(upload_date) as date,
        COUNT(*) as uploads,
        COALESCE(SUM(file_size), 0) as bytes_uploaded
      FROM photos 
      WHERE user_id = ? 
        AND upload_date >= date('now', '-${days} days')
        AND upload_completed = 1
      GROUP BY date(upload_date)
      ORDER BY date DESC
    `).bind(user.sub).all();
    
    // Get daily access statistics
    const accessStats = await c.env.DB.prepare(`
      SELECT 
        date(accessed_at) as date,
        COUNT(*) as total_accesses,
        COALESCE(SUM(CASE WHEN access_type = 'original' THEN 1 ELSE 0 END), 0) as original_accesses,
        COALESCE(SUM(cost_incurred_usd), 0) as daily_cost
      FROM access_logs 
      WHERE accessed_at >= date('now', '-${days} days')
        AND photo_id IN (SELECT id FROM photos WHERE user_id = ?)
      GROUP BY date(accessed_at)
      ORDER BY date DESC
    `).bind(user.sub).all();
    
    const response: APIResponse = {
      success: true,
      data: {
        period_days: days,
        upload_history: historyStats.results,
        access_history: accessStats.results,
      },
    };
    
    return c.json(response);
  } catch (error) {
    if (error instanceof APIError) throw error;
    console.error('History stats error:', error);
    throw new APIError(500, 'Failed to retrieve historical statistics');
  }
});

/**
 * GET /alerts - Get current alerts
 */
stats.get('/alerts', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    // Get alert settings
    const alertSettings = await c.env.DB.prepare(`
      SELECT alert_type, threshold_value, is_enabled
      FROM alert_settings 
      WHERE user_id = ? AND is_enabled = 1
    `).bind(user.sub).all();
    
    // Get current usage for alert evaluation
    const usage = await getCurrentStorageUsage(c.env);
    const quotaPercentage = (usage.totalGB / STORAGE_PRICING.FREE_QUOTA_GB) * 100;
    
    const alerts: Alert[] = [];
    
    // Check quota alerts
    for (const setting of alertSettings.results) {
      if (setting.alert_type === 'storage_quota' && quotaPercentage >= setting.threshold_value) {
        alerts.push({
          type: quotaPercentage >= 95 ? 'quota_95' : 'quota_80',
          message: `ストレージ使用量が${setting.threshold_value}%を超えました`,
          severity: setting.threshold_value >= 95 ? 'critical' : 'warning',
          triggered_at: new Date().toISOString(),
        });
      }
    }
    
    const response: APIResponse = {
      success: true,
      data: {
        alerts,
        alert_settings: alertSettings.results,
      },
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Alerts error:', error);
    throw new APIError(500, 'Failed to retrieve alerts');
  }
});

/**
 * POST /alerts/settings - Update alert settings
 */
stats.post('/alerts/settings', authMiddleware, zValidator('json', alertSettingsSchema), async (c) => {
  try {
    const user = c.get('user');
    const { alert_type, threshold_value, is_enabled } = c.req.valid('json');
    
    // Upsert alert setting
    await c.env.DB.prepare(`
      INSERT INTO alert_settings (user_id, alert_type, threshold_value, is_enabled, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, alert_type) DO UPDATE SET
        threshold_value = excluded.threshold_value,
        is_enabled = excluded.is_enabled,
        updated_at = datetime('now')
    `).bind(user.sub, alert_type, threshold_value, is_enabled ? 1 : 0).run();
    
    const response: APIResponse = {
      success: true,
      message: 'Alert settings updated successfully',
    };
    
    return c.json(response);
  } catch (error) {
    console.error('Alert settings error:', error);
    throw new APIError(500, 'Failed to update alert settings');
  }
});

export default stats;
