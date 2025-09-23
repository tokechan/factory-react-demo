import { useEffect, useCallback } from 'react';
import { useAlerts } from './useAlerts';
import '../utils/alertSystem';

// Mock API client import (in real app, import the actual API client)
interface MockApiClient {
  getUsageStats(): Promise<any>;
  getCostDashboard(): Promise<any>;
}

// System metrics hook for collecting data and triggering alerts
export const useSystemMetrics = (apiClient?: MockApiClient) => {
  const { addMetric } = useAlerts();

  // Collect storage metrics
  const collectStorageMetrics = useCallback(async () => {
    try {
      // In real implementation, get from API
      if (apiClient) {
        const stats = await apiClient.getUsageStats();
        
        // Storage quota percentage
        addMetric({
          name: 'storage.quota_percentage',
          value: stats.quota_percentage || 0,
          timestamp: new Date(),
          tags: { source: 'api' },
        });

        // Storage usage in GB
        addMetric({
          name: 'storage.total_gb',
          value: stats.storage?.total_gb || 0,
          timestamp: new Date(),
          tags: { source: 'api' },
        });

        // File count
        addMetric({
          name: 'storage.file_count',
          value: stats.storage?.file_count || 0,
          timestamp: new Date(),
          tags: { source: 'api' },
        });
      } else {
        // Mock data for development
        const mockQuotaPercentage = Math.random() * 100;
        
        addMetric({
          name: 'storage.quota_percentage',
          value: mockQuotaPercentage,
          timestamp: new Date(),
          tags: { source: 'mock' },
        });
      }
    } catch (error) {
      console.error('Failed to collect storage metrics:', error);
      
      // Report metric collection failure
      addMetric({
        name: 'system.metric_collection_failure',
        value: 1,
        timestamp: new Date(),
        tags: { metric: 'storage', error: (error as Error).message },
      });
    }
  }, [apiClient, addMetric]);

  // Collect cost metrics
  const collectCostMetrics = useCallback(async () => {
    try {
      if (apiClient) {
        const costData = await apiClient.getCostDashboard();
        
        // Monthly cost as percentage of budget (assuming $10 budget)
        const budgetUSD = 10;
        const currentCostUSD = costData.monthly_cost?.total_usd || 0;
        const budgetPercentage = (currentCostUSD / budgetUSD) * 100;
        
        addMetric({
          name: 'cost.monthly_budget_percentage',
          value: budgetPercentage,
          timestamp: new Date(),
          tags: { source: 'api', budget: budgetUSD.toString() },
        });

        // Absolute cost
        addMetric({
          name: 'cost.monthly_total_usd',
          value: currentCostUSD,
          timestamp: new Date(),
          tags: { source: 'api' },
        });
      } else {
        // Mock cost data
        const mockBudgetPercentage = Math.random() * 120; // Can exceed 100%
        
        addMetric({
          name: 'cost.monthly_budget_percentage',
          value: mockBudgetPercentage,
          timestamp: new Date(),
          tags: { source: 'mock' },
        });
      }
    } catch (error) {
      console.error('Failed to collect cost metrics:', error);
      
      addMetric({
        name: 'system.metric_collection_failure',
        value: 1,
        timestamp: new Date(),
        tags: { metric: 'cost', error: (error as Error).message },
      });
    }
  }, [apiClient, addMetric]);

  // Collect security metrics
  const collectSecurityMetrics = useCallback(() => {
    try {
      // Mock security metrics (in real app, collect from auth system)
      const failedLogins = Math.floor(Math.random() * 10);
      const downloadVolume = Math.random() * 20; // GB
      
      addMetric({
        name: 'security.failed_logins',
        value: failedLogins,
        timestamp: new Date(),
        tags: { source: 'mock', timeWindow: '15m' },
      });

      addMetric({
        name: 'security.download_volume_gb',
        value: downloadVolume,
        timestamp: new Date(),
        tags: { source: 'mock', timeWindow: '1h' },
      });
    } catch (error) {
      console.error('Failed to collect security metrics:', error);
      
      addMetric({
        name: 'system.metric_collection_failure',
        value: 1,
        timestamp: new Date(),
        tags: { metric: 'security', error: (error as Error).message },
      });
    }
  }, [addMetric]);

  // Collect system performance metrics
  const collectPerformanceMetrics = useCallback(() => {
    try {
      // Mock performance metrics
      const apiResponseTime = Math.random() * 10000; // ms
      const uploadFailureRate = Math.random() * 0.2; // 20% max
      
      addMetric({
        name: 'performance.api_response_time_ms',
        value: apiResponseTime,
        timestamp: new Date(),
        tags: { source: 'mock', endpoint: 'average' },
      });

      addMetric({
        name: 'system.upload_failure_rate',
        value: uploadFailureRate,
        timestamp: new Date(),
        tags: { source: 'mock', timeWindow: '30m' },
      });

      // Browser performance metrics
      if (typeof window !== 'undefined' && window.performance) {
        const navigation = window.performance.getEntriesByType('navigation')[0] as any;
        if (navigation) {
          addMetric({
            name: 'performance.page_load_time_ms',
            value: navigation.loadEventEnd - navigation.loadEventStart,
            timestamp: new Date(),
            tags: { source: 'browser' },
          });
        }

        // Memory usage (if available)
        if ((window.performance as any).memory) {
          const memory = (window.performance as any).memory;
          addMetric({
            name: 'performance.memory_used_mb',
            value: memory.usedJSHeapSize / 1024 / 1024,
            timestamp: new Date(),
            tags: { source: 'browser' },
          });
        }
      }
    } catch (error) {
      console.error('Failed to collect performance metrics:', error);
      
      addMetric({
        name: 'system.metric_collection_failure',
        value: 1,
        timestamp: new Date(),
        tags: { metric: 'performance', error: (error as Error).message },
      });
    }
  }, [addMetric]);

  // Collect user activity metrics
  const collectActivityMetrics = useCallback(() => {
    try {
      // Mock user activity (in real app, track actual user actions)
      const activeUsers = Math.floor(Math.random() * 10) + 1;
      const uploadsPerHour = Math.floor(Math.random() * 50);
      const downloadsPerHour = Math.floor(Math.random() * 100);
      
      addMetric({
        name: 'activity.active_users',
        value: activeUsers,
        timestamp: new Date(),
        tags: { source: 'mock', timeWindow: '5m' },
      });

      addMetric({
        name: 'activity.uploads_per_hour',
        value: uploadsPerHour,
        timestamp: new Date(),
        tags: { source: 'mock' },
      });

      addMetric({
        name: 'activity.downloads_per_hour',
        value: downloadsPerHour,
        timestamp: new Date(),
        tags: { source: 'mock' },
      });
    } catch (error) {
      console.error('Failed to collect activity metrics:', error);
      
      addMetric({
        name: 'system.metric_collection_failure',
        value: 1,
        timestamp: new Date(),
        tags: { metric: 'activity', error: (error as Error).message },
      });
    }
  }, [addMetric]);

  // Collect all metrics
  const collectAllMetrics = useCallback(async () => {
    await Promise.allSettled([
      collectStorageMetrics(),
      collectCostMetrics(),
      collectSecurityMetrics(),
      collectPerformanceMetrics(),
      collectActivityMetrics(),
    ]);
  }, [
    collectStorageMetrics,
    collectCostMetrics,
    collectSecurityMetrics,
    collectPerformanceMetrics,
    collectActivityMetrics,
  ]);

  // Set up periodic metric collection
  useEffect(() => {
    // Collect metrics immediately
    collectAllMetrics();

    // Set up intervals for different metric types
    const storageInterval = setInterval(collectStorageMetrics, 5 * 60 * 1000); // Every 5 minutes
    const costInterval = setInterval(collectCostMetrics, 15 * 60 * 1000); // Every 15 minutes
    const securityInterval = setInterval(collectSecurityMetrics, 2 * 60 * 1000); // Every 2 minutes
    const performanceInterval = setInterval(collectPerformanceMetrics, 1 * 60 * 1000); // Every minute
    const activityInterval = setInterval(collectActivityMetrics, 3 * 60 * 1000); // Every 3 minutes

    return () => {
      clearInterval(storageInterval);
      clearInterval(costInterval);
      clearInterval(securityInterval);
      clearInterval(performanceInterval);
      clearInterval(activityInterval);
    };
  }, [
    collectAllMetrics,
    collectStorageMetrics,
    collectCostMetrics,
    collectSecurityMetrics,
    collectPerformanceMetrics,
    collectActivityMetrics,
  ]);

  // Manual metric collection functions
  const triggerStorageAlert = useCallback(() => {
    addMetric({
      name: 'storage.quota_percentage',
      value: 85, // Trigger warning threshold
      timestamp: new Date(),
      tags: { source: 'manual', trigger: 'test' },
    });
  }, [addMetric]);

  const triggerCostAlert = useCallback(() => {
    addMetric({
      name: 'cost.monthly_budget_percentage',
      value: 105, // Exceed budget
      timestamp: new Date(),
      tags: { source: 'manual', trigger: 'test' },
    });
  }, [addMetric]);

  const triggerSecurityAlert = useCallback(() => {
    addMetric({
      name: 'security.failed_logins',
      value: 8, // Above threshold
      timestamp: new Date(),
      tags: { source: 'manual', trigger: 'test' },
    });
  }, [addMetric]);

  const triggerPerformanceAlert = useCallback(() => {
    addMetric({
      name: 'performance.api_response_time_ms',
      value: 6000, // 6 seconds - above threshold
      timestamp: new Date(),
      tags: { source: 'manual', trigger: 'test' },
    });
  }, [addMetric]);

  // Monitor page visibility to pause/resume metrics collection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Resume metric collection when page becomes visible
        collectAllMetrics();
      }
      // Pause is handled automatically by intervals
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [collectAllMetrics]);

  // Detect and report client-side errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      addMetric({
        name: 'system.client_error_rate',
        value: 1,
        timestamp: new Date(),
        tags: { 
          source: 'browser',
          error: event.error?.name || 'Unknown',
          message: event.message,
        },
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      addMetric({
        name: 'system.client_error_rate',
        value: 1,
        timestamp: new Date(),
        tags: { 
          source: 'browser',
          error: 'UnhandledPromiseRejection',
          message: String(event.reason),
        },
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [addMetric]);

  return {
    // Manual metric collection
    collectAllMetrics,
    collectStorageMetrics,
    collectCostMetrics,
    collectSecurityMetrics,
    collectPerformanceMetrics,
    collectActivityMetrics,

    // Test alert triggers
    triggerStorageAlert,
    triggerCostAlert,
    triggerSecurityAlert,
    triggerPerformanceAlert,
  };
};
