// Alert management system for monitoring and notifications
import { nanoid } from 'nanoid';

// Alert types and severity levels
export enum AlertType {
  STORAGE_QUOTA = 'storage_quota',
  COST_BUDGET = 'cost_budget',
  SECURITY_BREACH = 'security_breach',
  SYSTEM_ERROR = 'system_error',
  PERFORMANCE = 'performance',
  MAINTENANCE = 'maintenance',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  ACTIVE = 'active',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
}

export enum NotificationChannel {
  BROWSER = 'browser',
  EMAIL = 'email',
  SLACK = 'slack',
  IN_APP = 'in_app',
  SMS = 'sms',
}

// Alert interfaces
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  conditions: AlertCondition[];
  actions: AlertAction[];
  cooldownMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  metric: string;
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'contains' | 'not_contains';
  threshold: number | string;
  timeWindow?: number; // minutes
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
}

export interface AlertAction {
  type: 'notification' | 'webhook' | 'auto_action';
  channel?: NotificationChannel;
  target: string; // email, webhook URL, etc.
  template?: string;
  enabled: boolean;
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleName: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  details?: Record<string, any>;
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  resolvedBy?: string;
  escalationLevel: number;
  notificationsSent: NotificationRecord[];
  tags: string[];
}

export interface NotificationRecord {
  id: string;
  channel: NotificationChannel;
  target: string;
  sentAt: Date;
  success: boolean;
  error?: string;
  retryCount: number;
}

// Metric data for alert evaluation
export interface MetricData {
  name: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

// Alert configuration
export interface AlertConfig {
  enabled: boolean;
  defaultSeverityThresholds: {
    [key in AlertType]: {
      [key in AlertSeverity]: number;
    };
  };
  notificationSettings: {
    [key in NotificationChannel]: {
      enabled: boolean;
      config: Record<string, any>;
    };
  };
  escalationSettings: {
    enabled: boolean;
    levels: Array<{
      afterMinutes: number;
      channels: NotificationChannel[];
      targets: string[];
    }>;
  };
  maintenanceMode: {
    enabled: boolean;
    until?: Date;
    suppressAll: boolean;
    allowedTypes: AlertType[];
  };
}

// Pre-defined alert rules
export const DEFAULT_ALERT_RULES: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Storage quota alerts
  {
    name: 'Storage Quota Warning (80%)',
    description: 'Alert when storage usage exceeds 80% of quota',
    type: AlertType.STORAGE_QUOTA,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    conditions: [
      {
        metric: 'storage.quota_percentage',
        operator: 'gte',
        threshold: 80,
      },
    ],
    actions: [
      {
        type: 'notification',
        channel: NotificationChannel.IN_APP,
        target: 'dashboard',
        enabled: true,
      },
      {
        type: 'notification',
        channel: NotificationChannel.BROWSER,
        target: 'user',
        enabled: true,
      },
    ],
    cooldownMinutes: 60,
  },
  {
    name: 'Storage Quota Critical (95%)',
    description: 'Critical alert when storage usage exceeds 95% of quota',
    type: AlertType.STORAGE_QUOTA,
    severity: AlertSeverity.CRITICAL,
    enabled: true,
    conditions: [
      {
        metric: 'storage.quota_percentage',
        operator: 'gte',
        threshold: 95,
      },
    ],
    actions: [
      {
        type: 'notification',
        channel: NotificationChannel.IN_APP,
        target: 'dashboard',
        enabled: true,
      },
      {
        type: 'notification',
        channel: NotificationChannel.BROWSER,
        target: 'user',
        enabled: true,
      },
      {
        type: 'notification',
        channel: NotificationChannel.EMAIL,
        target: 'user',
        enabled: false, // Email needs to be configured
      },
    ],
    cooldownMinutes: 30,
  },

  // Cost budget alerts
  {
    name: 'Monthly Cost Budget Warning (80%)',
    description: 'Alert when monthly costs exceed 80% of budget',
    type: AlertType.COST_BUDGET,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    conditions: [
      {
        metric: 'cost.monthly_budget_percentage',
        operator: 'gte',
        threshold: 80,
      },
    ],
    actions: [
      {
        type: 'notification',
        channel: NotificationChannel.IN_APP,
        target: 'dashboard',
        enabled: true,
      },
    ],
    cooldownMinutes: 1440, // 24 hours
  },
  {
    name: 'Monthly Cost Budget Exceeded',
    description: 'Critical alert when monthly costs exceed budget',
    type: AlertType.COST_BUDGET,
    severity: AlertSeverity.HIGH,
    enabled: true,
    conditions: [
      {
        metric: 'cost.monthly_budget_percentage',
        operator: 'gte',
        threshold: 100,
      },
    ],
    actions: [
      {
        type: 'notification',
        channel: NotificationChannel.IN_APP,
        target: 'dashboard',
        enabled: true,
      },
      {
        type: 'notification',
        channel: NotificationChannel.BROWSER,
        target: 'user',
        enabled: true,
      },
    ],
    cooldownMinutes: 180, // 3 hours
  },

  // Security alerts
  {
    name: 'Multiple Failed Login Attempts',
    description: 'Alert on suspicious login activity',
    type: AlertType.SECURITY_BREACH,
    severity: AlertSeverity.HIGH,
    enabled: true,
    conditions: [
      {
        metric: 'security.failed_logins',
        operator: 'gte',
        threshold: 5,
        timeWindow: 15, // 15 minutes
        aggregation: 'count',
      },
    ],
    actions: [
      {
        type: 'notification',
        channel: NotificationChannel.IN_APP,
        target: 'dashboard',
        enabled: true,
      },
      {
        type: 'notification',
        channel: NotificationChannel.BROWSER,
        target: 'user',
        enabled: true,
      },
    ],
    cooldownMinutes: 60,
  },
  {
    name: 'Large Download Volume',
    description: 'Alert on unusually large download volumes',
    type: AlertType.SECURITY_BREACH,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    conditions: [
      {
        metric: 'security.download_volume_gb',
        operator: 'gte',
        threshold: 10,
        timeWindow: 60, // 1 hour
        aggregation: 'sum',
      },
    ],
    actions: [
      {
        type: 'notification',
        channel: NotificationChannel.IN_APP,
        target: 'dashboard',
        enabled: true,
      },
    ],
    cooldownMinutes: 120,
  },

  // System error alerts
  {
    name: 'Upload Failure Rate High',
    description: 'Alert when upload failure rate exceeds threshold',
    type: AlertType.SYSTEM_ERROR,
    severity: AlertSeverity.HIGH,
    enabled: true,
    conditions: [
      {
        metric: 'system.upload_failure_rate',
        operator: 'gte',
        threshold: 0.1, // 10%
        timeWindow: 30,
        aggregation: 'avg',
      },
    ],
    actions: [
      {
        type: 'notification',
        channel: NotificationChannel.IN_APP,
        target: 'dashboard',
        enabled: true,
      },
    ],
    cooldownMinutes: 30,
  },

  // Performance alerts
  {
    name: 'API Response Time High',
    description: 'Alert when API response time is consistently high',
    type: AlertType.PERFORMANCE,
    severity: AlertSeverity.MEDIUM,
    enabled: true,
    conditions: [
      {
        metric: 'performance.api_response_time_ms',
        operator: 'gte',
        threshold: 5000, // 5 seconds
        timeWindow: 15,
        aggregation: 'avg',
      },
    ],
    actions: [
      {
        type: 'notification',
        channel: NotificationChannel.IN_APP,
        target: 'dashboard',
        enabled: true,
      },
    ],
    cooldownMinutes: 15,
  },
];

// Alert evaluation functions
export class AlertEvaluator {
  private metrics: Map<string, MetricData[]> = new Map();
  private rules: AlertRule[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private lastEvaluationTime: Map<string, Date> = new Map();

  constructor(rules: AlertRule[]) {
    this.rules = rules;
  }

  /**
   * Add metric data for evaluation
   */
  addMetric(metric: MetricData): void {
    if (!this.metrics.has(metric.name)) {
      this.metrics.set(metric.name, []);
    }
    
    const metricHistory = this.metrics.get(metric.name)!;
    metricHistory.push(metric);
    
    // Keep only recent data (last 24 hours)
    const cutoffTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    this.metrics.set(
      metric.name,
      metricHistory.filter(m => m.timestamp > cutoffTime)
    );
  }

  /**
   * Evaluate all rules against current metrics
   */
  evaluate(): Alert[] {
    const newAlerts: Alert[] = [];
    const now = new Date();

    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      const lastEvaluation = this.lastEvaluationTime.get(rule.id);
      const cooldownExpired = !lastEvaluation || 
        (now.getTime() - lastEvaluation.getTime()) >= (rule.cooldownMinutes * 60 * 1000);

      if (!cooldownExpired) continue;

      const shouldAlert = this.evaluateRule(rule);
      
      if (shouldAlert) {
        const existingAlert = Array.from(this.activeAlerts.values())
          .find(alert => alert.ruleId === rule.id && alert.status === AlertStatus.ACTIVE);

        if (!existingAlert) {
          const alert = this.createAlert(rule);
          this.activeAlerts.set(alert.id, alert);
          newAlerts.push(alert);
          this.lastEvaluationTime.set(rule.id, now);
        }
      }
    }

    return newAlerts;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(rule: AlertRule): boolean {
    return rule.conditions.every(condition => this.evaluateCondition(condition));
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: AlertCondition): boolean {
    const metricData = this.metrics.get(condition.metric);
    if (!metricData || metricData.length === 0) return false;

    let value: number;

    if (condition.timeWindow && condition.aggregation) {
      const cutoffTime = new Date(Date.now() - condition.timeWindow * 60 * 1000);
      const recentData = metricData.filter(m => m.timestamp > cutoffTime);
      
      if (recentData.length === 0) return false;

      switch (condition.aggregation) {
        case 'avg':
          value = recentData.reduce((sum, m) => sum + m.value, 0) / recentData.length;
          break;
        case 'sum':
          value = recentData.reduce((sum, m) => sum + m.value, 0);
          break;
        case 'min':
          value = Math.min(...recentData.map(m => m.value));
          break;
        case 'max':
          value = Math.max(...recentData.map(m => m.value));
          break;
        case 'count':
          value = recentData.length;
          break;
        default:
          value = recentData[recentData.length - 1].value;
      }
    } else {
      value = metricData[metricData.length - 1].value;
    }

    const threshold = typeof condition.threshold === 'number' 
      ? condition.threshold 
      : parseFloat(condition.threshold);

    switch (condition.operator) {
      case 'gt': return value > threshold;
      case 'gte': return value >= threshold;
      case 'lt': return value < threshold;
      case 'lte': return value <= threshold;
      case 'eq': return value === threshold;
      case 'neq': return value !== threshold;
      case 'contains': return String(value).includes(String(condition.threshold));
      case 'not_contains': return !String(value).includes(String(condition.threshold));
      default: return false;
    }
  }

  /**
   * Create an alert from a rule
   */
  private createAlert(rule: AlertRule): Alert {
    const alert: Alert = {
      id: nanoid(),
      ruleId: rule.id,
      ruleName: rule.name,
      type: rule.type,
      severity: rule.severity,
      status: AlertStatus.ACTIVE,
      title: rule.name,
      message: rule.description,
      details: this.gatherAlertDetails(rule),
      triggeredAt: new Date(),
      escalationLevel: 0,
      notificationsSent: [],
      tags: [rule.type, rule.severity],
    };

    return alert;
  }

  /**
   * Gather additional details for an alert
   */
  private gatherAlertDetails(rule: AlertRule): Record<string, any> {
    const details: Record<string, any> = {};
    
    for (const condition of rule.conditions) {
      const metricData = this.metrics.get(condition.metric);
      if (metricData && metricData.length > 0) {
        const latestValue = metricData[metricData.length - 1].value;
        details[condition.metric] = {
          currentValue: latestValue,
          threshold: condition.threshold,
          operator: condition.operator,
        };
      }
    }
    
    return details;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status === AlertStatus.ACTIVE) {
      alert.status = AlertStatus.ACKNOWLEDGED;
      alert.acknowledgedAt = new Date();
      alert.acknowledgedBy = acknowledgedBy;
      return true;
    }
    return false;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status !== AlertStatus.RESOLVED) {
      alert.status = AlertStatus.RESOLVED;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      return true;
    }
    return false;
  }
}

// Notification handlers
export class NotificationManager {
  private config: AlertConfig;

  constructor(config: AlertConfig) {
    this.config = config;
  }

  /**
   * Send notifications for an alert
   */
  async sendNotifications(alert: Alert, actions: AlertAction[]): Promise<NotificationRecord[]> {
    const records: NotificationRecord[] = [];

    for (const action of actions) {
      if (action.type !== 'notification' || !action.enabled || !action.channel) continue;

      const channelConfig = this.config.notificationSettings[action.channel];
      if (!channelConfig?.enabled) continue;

      const record = await this.sendNotification(alert, action);
      records.push(record);
    }

    return records;
  }

  /**
   * Send a single notification
   */
  private async sendNotification(alert: Alert, action: AlertAction): Promise<NotificationRecord> {
    const record: NotificationRecord = {
      id: nanoid(),
      channel: action.channel!,
      target: action.target,
      sentAt: new Date(),
      success: false,
      retryCount: 0,
    };

    try {
      switch (action.channel) {
        case NotificationChannel.BROWSER:
          await this.sendBrowserNotification(alert);
          break;
        case NotificationChannel.IN_APP:
          await this.sendInAppNotification(alert);
          break;
        case NotificationChannel.EMAIL:
          await this.sendEmailNotification(alert, action.target);
          break;
        case NotificationChannel.SLACK:
          await this.sendSlackNotification(alert, action.target);
          break;
        case NotificationChannel.SMS:
          await this.sendSMSNotification(alert, action.target);
          break;
      }
      
      record.success = true;
    } catch (error: any) {
      record.success = false;
      record.error = error.message;
    }

    return record;
  }

  /**
   * Send browser notification
   */
  private async sendBrowserNotification(alert: Alert): Promise<void> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      throw new Error('Browser notifications not supported');
    }

    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(alert.title, {
        body: alert.message,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: alert.id,
        requireInteraction: alert.severity === AlertSeverity.CRITICAL,
      });

      // Auto-close non-critical notifications
      if (alert.severity !== AlertSeverity.CRITICAL) {
        setTimeout(() => notification.close(), 10000);
      }
    } else {
      throw new Error('Browser notification permission denied');
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(alert: Alert): Promise<void> {
    // This will be handled by the notification context
    const event = new CustomEvent('alert-notification', {
      detail: alert,
    });
    window.dispatchEvent(event);
  }

  /**
   * Send email notification (mock implementation)
   */
  private async sendEmailNotification(alert: Alert, target: string): Promise<void> {
    // Mock implementation - in production, integrate with email service
    console.log(`Sending email notification to ${target}:`, alert);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send Slack notification (mock implementation)
   */
  private async sendSlackNotification(alert: Alert, webhookUrl: string): Promise<void> {
    // Mock implementation - in production, send to Slack webhook
    console.log(`Sending Slack notification to ${webhookUrl}:`, alert);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send SMS notification (mock implementation)
   */
  private async sendSMSNotification(alert: Alert, phoneNumber: string): Promise<void> {
    // Mock implementation - in production, integrate with SMS service
    console.log(`Sending SMS notification to ${phoneNumber}:`, alert);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Utility functions
export const formatAlertMessage = (alert: Alert): string => {
  const severity = alert.severity.toUpperCase();
  const timestamp = alert.triggeredAt.toLocaleString();
  
  return `[${severity}] ${alert.title}\n${alert.message}\nTriggered: ${timestamp}`;
};

export const getAlertIcon = (type: AlertType): string => {
  const icons = {
    [AlertType.STORAGE_QUOTA]: '💾',
    [AlertType.COST_BUDGET]: '💰',
    [AlertType.SECURITY_BREACH]: '🔒',
    [AlertType.SYSTEM_ERROR]: '⚠️',
    [AlertType.PERFORMANCE]: '⚡',
    [AlertType.MAINTENANCE]: '🔧',
  };
  
  return icons[type] || '🔔';
};

export const getAlertColor = (severity: AlertSeverity): string => {
  const colors = {
    [AlertSeverity.LOW]: 'blue',
    [AlertSeverity.MEDIUM]: 'yellow',
    [AlertSeverity.HIGH]: 'orange',
    [AlertSeverity.CRITICAL]: 'red',
  };
  
  return colors[severity] || 'gray';
};
