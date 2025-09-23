import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { useNotifications } from './useNotifications';
import {
  Alert,
  AlertRule,
  AlertConfig,
  AlertEvaluator,
  NotificationManager,
  MetricData,
  AlertType,
  AlertSeverity,
  AlertStatus,
  NotificationChannel,
  DEFAULT_ALERT_RULES,
} from '../utils/alertSystem';
import { nanoid } from 'nanoid';

interface AlertContextType {
  // Alert data
  alerts: Alert[];
  alertRules: AlertRule[];
  alertConfig: AlertConfig;
  
  // Alert management
  createAlert: (type: AlertType, severity: AlertSeverity, title: string, message: string, details?: Record<string, any>) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  dismissAlert: (alertId: string) => void;
  
  // Rule management
  createRule: (rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateRule: (ruleId: string, updates: Partial<AlertRule>) => void;
  deleteRule: (ruleId: string) => void;
  toggleRule: (ruleId: string, enabled: boolean) => void;
  
  // Metrics
  addMetric: (metric: MetricData) => void;
  getMetricHistory: (metricName: string, hours?: number) => MetricData[];
  
  // Configuration
  updateConfig: (config: Partial<AlertConfig>) => void;
  requestNotificationPermission: () => Promise<boolean>;
  
  // Statistics
  getAlertStats: () => {
    total: number;
    active: number;
    acknowledged: number;
    resolved: number;
    byType: Record<AlertType, number>;
    bySeverity: Record<AlertSeverity, number>;
  };
  
  // State
  isLoading: boolean;
  lastEvaluationTime?: Date;
}

const AlertContext = createContext<AlertContextType | null>(null);

interface AlertProviderProps {
  children: ReactNode;
}

// Default alert configuration
const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enabled: true,
  defaultSeverityThresholds: {
    [AlertType.STORAGE_QUOTA]: {
      [AlertSeverity.LOW]: 70,
      [AlertSeverity.MEDIUM]: 80,
      [AlertSeverity.HIGH]: 90,
      [AlertSeverity.CRITICAL]: 95,
    },
    [AlertType.COST_BUDGET]: {
      [AlertSeverity.LOW]: 60,
      [AlertSeverity.MEDIUM]: 80,
      [AlertSeverity.HIGH]: 100,
      [AlertSeverity.CRITICAL]: 120,
    },
    [AlertType.SECURITY_BREACH]: {
      [AlertSeverity.LOW]: 3,
      [AlertSeverity.MEDIUM]: 5,
      [AlertSeverity.HIGH]: 10,
      [AlertSeverity.CRITICAL]: 20,
    },
    [AlertType.SYSTEM_ERROR]: {
      [AlertSeverity.LOW]: 0.05,
      [AlertSeverity.MEDIUM]: 0.1,
      [AlertSeverity.HIGH]: 0.2,
      [AlertSeverity.CRITICAL]: 0.5,
    },
    [AlertType.PERFORMANCE]: {
      [AlertSeverity.LOW]: 2000,
      [AlertSeverity.MEDIUM]: 5000,
      [AlertSeverity.HIGH]: 10000,
      [AlertSeverity.CRITICAL]: 30000,
    },
    [AlertType.MAINTENANCE]: {
      [AlertSeverity.LOW]: 1,
      [AlertSeverity.MEDIUM]: 2,
      [AlertSeverity.HIGH]: 3,
      [AlertSeverity.CRITICAL]: 4,
    },
  },
  notificationSettings: {
    [NotificationChannel.BROWSER]: {
      enabled: true,
      config: { autoClose: true, requireInteraction: false },
    },
    [NotificationChannel.IN_APP]: {
      enabled: true,
      config: { position: 'top-right', autoClose: 10000 },
    },
    [NotificationChannel.EMAIL]: {
      enabled: false,
      config: { smtpServer: '', fromAddress: '', template: 'default' },
    },
    [NotificationChannel.SLACK]: {
      enabled: false,
      config: { webhookUrl: '', channel: '#alerts', username: 'AlertBot' },
    },
    [NotificationChannel.SMS]: {
      enabled: false,
      config: { provider: '', apiKey: '', fromNumber: '' },
    },
  },
  escalationSettings: {
    enabled: false,
    levels: [
      {
        afterMinutes: 15,
        channels: [NotificationChannel.EMAIL],
        targets: ['admin@example.com'],
      },
      {
        afterMinutes: 60,
        channels: [NotificationChannel.SLACK, NotificationChannel.SMS],
        targets: ['#critical-alerts', '+1234567890'],
      },
    ],
  },
  maintenanceMode: {
    enabled: false,
    suppressAll: false,
    allowedTypes: [],
  },
};

export const AlertProvider: React.FC<AlertProviderProps> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertRules, setAlertRules] = useState<AlertRule[]>([]);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>(DEFAULT_ALERT_CONFIG);
  const [isLoading] = useState(false);
  const [lastEvaluationTime, setLastEvaluationTime] = useState<Date>();
  
  const { showSuccess, showWarning, showError } = useNotifications();
  
  // Initialize alert evaluator and notification manager
  const [alertEvaluator, setAlertEvaluator] = useState<AlertEvaluator | null>(null);
  const [notificationManager, setNotificationManager] = useState<NotificationManager | null>(null);

  // Initialize default rules and load saved data
  useEffect(() => {
    // Load saved data from localStorage
    const savedAlerts = localStorage.getItem('alerts');
    const savedRules = localStorage.getItem('alertRules');
    const savedConfig = localStorage.getItem('alertConfig');

    if (savedAlerts) {
      try {
        const parsed = JSON.parse(savedAlerts);
        const converted = parsed.map((alert: any) => ({
          ...alert,
          triggeredAt: new Date(alert.triggeredAt),
          acknowledgedAt: alert.acknowledgedAt ? new Date(alert.acknowledgedAt) : undefined,
          resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined,
          notificationsSent: alert.notificationsSent.map((record: any) => ({
            ...record,
            sentAt: new Date(record.sentAt),
          })),
        }));
        setAlerts(converted);
      } catch (error) {
        console.error('Failed to load alerts from localStorage:', error);
      }
    }

    if (savedRules) {
      try {
        const parsed = JSON.parse(savedRules);
        const converted = parsed.map((rule: any) => ({
          ...rule,
          createdAt: new Date(rule.createdAt),
          updatedAt: new Date(rule.updatedAt),
        }));
        setAlertRules(converted);
      } catch (error) {
        console.error('Failed to load alert rules from localStorage:', error);
        // Initialize with default rules
        initializeDefaultRules();
      }
    } else {
      // Initialize with default rules
      initializeDefaultRules();
    }

    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        setAlertConfig({ ...DEFAULT_ALERT_CONFIG, ...parsed });
      } catch (error) {
        console.error('Failed to load alert config from localStorage:', error);
      }
    }
  }, [initializeDefaultRules]);

  // Initialize default rules
  const initializeDefaultRules = useCallback(() => {
    const now = new Date();
    const defaultRules: AlertRule[] = DEFAULT_ALERT_RULES.map(rule => ({
      ...rule,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    }));
    setAlertRules(defaultRules);
  }, []);

  // Initialize alert evaluator when rules change
  useEffect(() => {
    if (alertRules.length > 0) {
      const evaluator = new AlertEvaluator(alertRules);
      setAlertEvaluator(evaluator);
    }
  }, [alertRules]);

  // Initialize notification manager when config changes
  useEffect(() => {
    const manager = new NotificationManager(alertConfig);
    setNotificationManager(manager);
  }, [alertConfig]);

  // Save data to localStorage when state changes
  useEffect(() => {
    localStorage.setItem('alerts', JSON.stringify(alerts));
  }, [alerts]);

  useEffect(() => {
    localStorage.setItem('alertRules', JSON.stringify(alertRules));
  }, [alertRules]);

  useEffect(() => {
    localStorage.setItem('alertConfig', JSON.stringify(alertConfig));
  }, [alertConfig]);

  // Listen for custom alert events
  useEffect(() => {
    const handleAlertNotification = (event: CustomEvent<Alert>) => {
      const alert = event.detail;
      const notificationMethod = alert.severity === 'critical' || alert.severity === 'high' 
        ? showError 
        : alert.severity === 'medium' 
        ? showWarning 
        : showSuccess;
      
      notificationMethod(alert.title, alert.message);
    };

    window.addEventListener('alert-notification', handleAlertNotification as EventListener);
    return () => {
      window.removeEventListener('alert-notification', handleAlertNotification as EventListener);
    };
  }, [showSuccess, showWarning, showError]);

  // Periodic alert evaluation
  useEffect(() => {
    if (!alertEvaluator || !alertConfig.enabled) return;

    const interval = setInterval(() => {
      const newAlerts = alertEvaluator.evaluate();
      
      if (newAlerts.length > 0) {
        setAlerts(prev => [...prev, ...newAlerts]);
        setLastEvaluationTime(new Date());

        // Send notifications for new alerts
        newAlerts.forEach(alert => {
          const rule = alertRules.find(r => r.id === alert.ruleId);
          if (rule && notificationManager) {
            notificationManager.sendNotifications(alert, rule.actions).then(records => {
              // Update alert with notification records
              setAlerts(prev => prev.map(a => 
                a.id === alert.id 
                  ? { ...a, notificationsSent: [...a.notificationsSent, ...records] }
                  : a
              ));
            });
          }
        });
      }
    }, 60000); // Evaluate every minute

    return () => clearInterval(interval);
  }, [alertEvaluator, alertConfig.enabled, alertRules, notificationManager]);

  // Alert management functions
  const createAlert = useCallback((
    type: AlertType, 
    severity: AlertSeverity, 
    title: string, 
    message: string, 
    details?: Record<string, any>
  ) => {
    const alert: Alert = {
      id: nanoid(),
      ruleId: 'manual',
      ruleName: 'Manual Alert',
      type,
      severity,
      status: AlertStatus.ACTIVE,
      title,
      message,
      details,
      triggeredAt: new Date(),
      escalationLevel: 0,
      notificationsSent: [],
      tags: [type, severity, 'manual'],
    };

    setAlerts(prev => [alert, ...prev]);

    // Show in-app notification
    const notificationMethod = severity === 'critical' || severity === 'high' 
      ? showError 
      : severity === 'medium' 
      ? showWarning 
      : showSuccess;
    
    notificationMethod(title, message);

    // Send browser notification if enabled
    if (alertConfig.notificationSettings[NotificationChannel.BROWSER]?.enabled && notificationManager) {
      notificationManager.sendNotifications(alert, [
        {
          type: 'notification',
          channel: NotificationChannel.BROWSER,
          target: 'user',
          enabled: true,
        }
      ]);
    }
  }, [alertConfig, notificationManager, showSuccess, showWarning, showError]);

  const acknowledgeAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId && alert.status === AlertStatus.ACTIVE
        ? {
            ...alert,
            status: AlertStatus.ACKNOWLEDGED,
            acknowledgedAt: new Date(),
            acknowledgedBy: 'user', // In real app, get from auth context
          }
        : alert
    ));
    
    if (alertEvaluator) {
      alertEvaluator.acknowledgeAlert(alertId, 'user');
    }
  }, [alertEvaluator]);

  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId && alert.status !== AlertStatus.RESOLVED
        ? {
            ...alert,
            status: AlertStatus.RESOLVED,
            resolvedAt: new Date(),
            resolvedBy: 'user', // In real app, get from auth context
          }
        : alert
    ));

    if (alertEvaluator) {
      alertEvaluator.resolveAlert(alertId, 'user');
    }
  }, [alertEvaluator]);

  const dismissAlert = useCallback((alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  // Rule management functions
  const createRule = useCallback((rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    const newRule: AlertRule = {
      ...rule,
      id: nanoid(),
      createdAt: now,
      updatedAt: now,
    };
    
    setAlertRules(prev => [...prev, newRule]);
  }, []);

  const updateRule = useCallback((ruleId: string, updates: Partial<AlertRule>) => {
    setAlertRules(prev => prev.map(rule => 
      rule.id === ruleId 
        ? { ...rule, ...updates, updatedAt: new Date() }
        : rule
    ));
  }, []);

  const deleteRule = useCallback((ruleId: string) => {
    setAlertRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  const toggleRule = useCallback((ruleId: string, enabled: boolean) => {
    updateRule(ruleId, { enabled });
  }, [updateRule]);

  // Metric management
  const addMetric = useCallback((metric: MetricData) => {
    if (alertEvaluator) {
      alertEvaluator.addMetric(metric);
    }
  }, [alertEvaluator]);

  const getMetricHistory = useCallback((metricName: string, hours: number = 24): MetricData[] => {
    // This would typically come from the alert evaluator's metric store
    // For now, return empty array as metrics are handled internally
    return [];
  }, []);

  // Configuration management
  const updateConfig = useCallback((config: Partial<AlertConfig>) => {
    setAlertConfig(prev => ({ ...prev, ...config }));
  }, []);

  const requestNotificationPermission = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  // Statistics
  const getAlertStats = useCallback(() => {
    const stats = {
      total: alerts.length,
      active: 0,
      acknowledged: 0,
      resolved: 0,
      byType: {} as Record<AlertType, number>,
      bySeverity: {} as Record<AlertSeverity, number>,
    };

    // Initialize counters
    Object.values(AlertType).forEach(type => {
      stats.byType[type] = 0;
    });
    Object.values(AlertSeverity).forEach(severity => {
      stats.bySeverity[severity] = 0;
    });

    // Count alerts
    alerts.forEach(alert => {
      switch (alert.status) {
        case AlertStatus.ACTIVE:
          stats.active++;
          break;
        case AlertStatus.ACKNOWLEDGED:
          stats.acknowledged++;
          break;
        case AlertStatus.RESOLVED:
          stats.resolved++;
          break;
      }

      stats.byType[alert.type]++;
      stats.bySeverity[alert.severity]++;
    });

    return stats;
  }, [alerts]);

  const contextValue: AlertContextType = {
    // Data
    alerts,
    alertRules,
    alertConfig,
    
    // Alert management
    createAlert,
    acknowledgeAlert,
    resolveAlert,
    dismissAlert,
    
    // Rule management
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    
    // Metrics
    addMetric,
    getMetricHistory,
    
    // Configuration
    updateConfig,
    requestNotificationPermission,
    
    // Statistics
    getAlertStats,
    
    // State
    isLoading,
    lastEvaluationTime,
  };

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
    </AlertContext.Provider>
  );
};

export const useAlerts = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};
