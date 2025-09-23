import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAlerts } from '../hooks/useAlerts';
import { AlertType, AlertSeverity, AlertStatus, getAlertIcon } from '../utils/alertSystem';
import Card from '../components/Card';
import Button from '../components/Button';

const AlertsPage: React.FC = () => {
  const { 
    alerts, 
    alertRules, 
    alertConfig,
    acknowledgeAlert, 
    resolveAlert, 
    dismissAlert,

    updateConfig,
    requestNotificationPermission,
    getAlertStats,
    createAlert,
  } = useAlerts();

  const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'settings'>('alerts');
  const [filterStatus, setFilterStatus] = useState<'all' | AlertStatus>('all');
  const [filterSeverity, setFilterSeverity] = useState<'all' | AlertSeverity>('all');
  const [filterType, setFilterType] = useState<'all' | AlertType>('all');
  const [sortBy, setSortBy] = useState<'triggered' | 'severity' | 'type'>('triggered');

  const stats = getAlertStats();

  // Filter and sort alerts
  const filteredAlerts = useMemo(() => {
    let filtered = [...alerts];

    // Apply filters
    if (filterStatus !== 'all') {
      filtered = filtered.filter(alert => alert.status === filterStatus);
    }
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(alert => alert.severity === filterSeverity);
    }
    if (filterType !== 'all') {
      filtered = filtered.filter(alert => alert.type === filterType);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'severity':
          const severityOrder = {
            [AlertSeverity.CRITICAL]: 4,
            [AlertSeverity.HIGH]: 3,
            [AlertSeverity.MEDIUM]: 2,
            [AlertSeverity.LOW]: 1,
          };
          return severityOrder[b.severity] - severityOrder[a.severity];
        case 'type':
          return a.type.localeCompare(b.type);
        default:
          return b.triggeredAt.getTime() - a.triggeredAt.getTime();
      }
    });

    return filtered;
  }, [alerts, filterStatus, filterSeverity, filterType, sortBy]);

  const handleCreateTestAlert = () => {
    createAlert(
      AlertType.SYSTEM_ERROR,
      AlertSeverity.HIGH,
      'Test Alert',
      'This is a test alert created manually for demonstration purposes.'
    );
  };

  const handleRequestNotificationPermission = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      updateConfig({
        notificationSettings: {
          ...alertConfig.notificationSettings,
          browser: {
            ...alertConfig.notificationSettings.browser,
            enabled: true,
          },
        },
      });
    }
  };

  const getSeverityBadgeColor = (severity: AlertSeverity) => {
    const colors = {
      [AlertSeverity.CRITICAL]: 'bg-red-100 text-red-800',
      [AlertSeverity.HIGH]: 'bg-orange-100 text-orange-800',
      [AlertSeverity.MEDIUM]: 'bg-yellow-100 text-yellow-800',
      [AlertSeverity.LOW]: 'bg-blue-100 text-blue-800',
    };
    return colors[severity] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadgeColor = (status: AlertStatus) => {
    const colors = {
      [AlertStatus.ACTIVE]: 'bg-red-100 text-red-800',
      [AlertStatus.ACKNOWLEDGED]: 'bg-yellow-100 text-yellow-800',
      [AlertStatus.RESOLVED]: 'bg-green-100 text-green-800',
      [AlertStatus.SUPPRESSED]: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">⚠️ アラート管理</h1>
              <p className="text-gray-600 mt-1">システム監視とアラート設定の管理</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleCreateTestAlert}
              >
                🧪 テストアラート
              </Button>
              <Link to="/dashboard">
                <Button variant="primary">
                  🏠 ダッシュボード
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.active}</div>
              <div className="text-sm text-gray-600">アクティブ</div>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.acknowledged}</div>
              <div className="text-sm text-gray-600">確認済み</div>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
              <div className="text-sm text-gray-600">解決済み</div>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">総アラート数</div>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'alerts', label: '🔔 アラート', count: stats.total },
                { key: 'rules', label: '⚙️ ルール', count: alertRules.length },
                { key: 'settings', label: '🔧 設定' },
              ].map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {label}
                  {count !== undefined && (
                    <span className="ml-2 py-0.5 px-2 text-xs bg-gray-100 rounded-full">
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      ステータス
                    </label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">すべて</option>
                      <option value={AlertStatus.ACTIVE}>アクティブ</option>
                      <option value={AlertStatus.ACKNOWLEDGED}>確認済み</option>
                      <option value={AlertStatus.RESOLVED}>解決済み</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      重要度
                    </label>
                    <select
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">すべて</option>
                      <option value={AlertSeverity.CRITICAL}>Critical</option>
                      <option value={AlertSeverity.HIGH}>High</option>
                      <option value={AlertSeverity.MEDIUM}>Medium</option>
                      <option value={AlertSeverity.LOW}>Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      種別
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as any)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">すべて</option>
                      <option value={AlertType.STORAGE_QUOTA}>容量</option>
                      <option value={AlertType.COST_BUDGET}>コスト</option>
                      <option value={AlertType.SECURITY_BREACH}>セキュリティ</option>
                      <option value={AlertType.SYSTEM_ERROR}>システムエラー</option>
                      <option value={AlertType.PERFORMANCE}>パフォーマンス</option>
                      <option value={AlertType.MAINTENANCE}>メンテナンス</option>
                    </select>
                  </div>
                </div>

                <div className="ml-auto">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    並び順
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="triggered">発生時刻</option>
                    <option value="severity">重要度</option>
                    <option value="type">種別</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Alerts List */}
            {filteredAlerts.length === 0 ? (
              <Card>
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔔</div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    アラートがありません
                  </h3>
                  <p className="text-gray-600">
                    現在表示するアラートがありません
                  </p>
                </div>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAlerts.map(alert => (
                  <Card key={alert.id}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="text-2xl">
                          {getAlertIcon(alert.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              {alert.title}
                            </h3>
                            <span className={`px-2 py-1 text-xs font-medium rounded uppercase ${getSeverityBadgeColor(alert.severity)}`}>
                              {alert.severity}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded uppercase ${getStatusBadgeColor(alert.status)}`}>
                              {alert.status}
                            </span>
                          </div>
                          
                          <p className="text-gray-700 mb-2">{alert.message}</p>
                          
                          <div className="text-sm text-gray-500 space-y-1">
                            <div>発生: {alert.triggeredAt.toLocaleString()}</div>
                            {alert.acknowledgedAt && (
                              <div>確認: {alert.acknowledgedAt.toLocaleString()}</div>
                            )}
                            {alert.resolvedAt && (
                              <div>解決: {alert.resolvedAt.toLocaleString()}</div>
                            )}
                          </div>

                          {alert.details && Object.keys(alert.details).length > 0 && (
                            <details className="mt-2">
                              <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                                詳細情報を表示
                              </summary>
                              <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                {Object.entries(alert.details).map(([key, value]) => (
                                  <div key={key} className="flex justify-between py-1">
                                    <span className="font-medium">{key}:</span>
                                    <span>
                                      {typeof value === 'object' 
                                        ? `${(value as any).currentValue} ${(value as any).operator} ${(value as any).threshold}`
                                        : String(value)
                                      }
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        {alert.status === AlertStatus.ACTIVE && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => acknowledgeAlert(alert.id)}
                          >
                            ✓ 確認
                          </Button>
                        )}
                        
                        {alert.status !== AlertStatus.RESOLVED && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            ✓ 解決
                          </Button>
                        )}
                        
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => dismissAlert(alert.id)}
                        >
                          🗑️ 削除
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <Card>
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚙️</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  アラートルール管理
                </h3>
                <p className="text-gray-600">
                  この機能は開発中です。現在は{alertRules.length}個のデフォルトルールが設定されています。
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <Card title="🔔 通知設定">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">ブラウザ通知</h4>
                    <p className="text-sm text-gray-600">
                      アラート発生時にブラウザ通知を表示します
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={handleRequestNotificationPermission}
                    disabled={alertConfig.notificationSettings.browser?.enabled}
                  >
                    {alertConfig.notificationSettings.browser?.enabled 
                      ? '✅ 許可済み' 
                      : '🔔 許可する'
                    }
                  </Button>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">メール通知</h4>
                      <p className="text-sm text-gray-600">
                        重要なアラートをメールで通知します
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      設定が必要
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">Slack統合</h4>
                      <p className="text-sm text-gray-600">
                        アラートをSlackチャンネルに送信します
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      設定が必要
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card title="⚙️ システム設定">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">アラートシステム</h4>
                    <p className="text-sm text-gray-600">
                      アラート監視機能の有効/無効
                    </p>
                  </div>
                  <div className={`px-3 py-1 text-sm font-medium rounded ${
                    alertConfig.enabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {alertConfig.enabled ? '🟢 有効' : '🔴 無効'}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900">メンテナンスモード</h4>
                      <p className="text-sm text-gray-600">
                        アラート送信を一時停止します
                      </p>
                    </div>
                    <div className={`px-3 py-1 text-sm font-medium rounded ${
                      alertConfig.maintenanceMode.enabled 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {alertConfig.maintenanceMode.enabled ? '🟡 メンテナンス中' : '🟢 通常運用'}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPage;
