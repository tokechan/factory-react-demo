import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { apiClient } from '../utils/api';
import { subDays, format } from 'date-fns';
import Button from '../components/Button';
import StorageChart from '../components/StorageChart';
import CostAnalysis from '../components/CostAnalysis';
import ActivityStats from '../components/ActivityStats';
import type { UsageStats, CostDashboard } from '../types';

const StatsPage: React.FC = () => {
  const { showError } = useNotifications();
  
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [costDashboard, setCostDashboard] = useState<CostDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'storage' | 'cost' | 'activity'>('overview');

  // Load statistics data
  useEffect(() => {
    loadStats();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const [usage, cost] = await Promise.all([
        apiClient.getUsageStats(),
        apiClient.getCostDashboard(),
      ]);
      
      setUsageStats(usage);
      setCostDashboard(cost);
    } catch (error: any) {
      console.error('Failed to load statistics:', error);
      showError('統計データの読み込みに失敗しました', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate mock historical data for charts
  const generateStorageHistory = () => {
    const days = Array.from({ length: 30 }, (_, i) => {
      const date = subDays(new Date(), 29 - i);
      const progress = (i + 1) / 30;
      
      return {
        date: format(date, 'yyyy-MM-dd'),
        standard_gb: usageStats ? usageStats.storage.standard_gb * progress * 0.7 : 0,
        ia_gb: usageStats ? usageStats.storage.ia_gb * progress * 1.3 : 0,
        total_gb: usageStats ? usageStats.storage.total_gb * progress : 0,
      };
    });
    
    return days;
  };

  const generateCostHistory = () => {
    const months = ['2024-06', '2024-07', '2024-08', '2024-09'];
    
    return months.map((month, index) => {
      const baseMultiplier = (index + 1) / 4;
      const monthlyCost = costDashboard ? costDashboard.monthly_cost.total_usd : 0;
      
      return {
        month: month.slice(5), // Get MM part
        storage_cost: monthlyCost * baseMultiplier * 0.6,
        operation_cost: monthlyCost * baseMultiplier * 0.3,
        retrieval_cost: monthlyCost * baseMultiplier * 0.1,
        total_cost: monthlyCost * baseMultiplier,
      };
    });
  };

  const generateActivityHistory = () => {
    return Array.from({ length: 14 }, (_, i) => {
      const date = subDays(new Date(), 13 - i);
      
      return {
        date: format(date, 'yyyy-MM-dd'),
        uploads: Math.floor(Math.random() * 5) + 1,
        views: Math.floor(Math.random() * 20) + 5,
        downloads: Math.floor(Math.random() * 3),
        original_accesses: Math.floor(Math.random() * 2),
      };
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">統計・コスト監視</h1>
          <p className="text-gray-600">ストレージ使用量とコストの詳細分析</p>
        </div>
        
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">統計データを読み込み中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!usageStats || !costDashboard) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">統計・コスト監視</h1>
          <p className="text-gray-600">ストレージ使用量とコストの詳細分析</p>
        </div>
        
        <div className="text-center py-16">
          <div className="text-6xl mb-6">📊</div>
          <h3 className="text-xl font-medium text-gray-900 mb-4">
            統計データが利用できません
          </h3>
          <p className="text-gray-600 mb-6">
            統計データの読み込みに問題が発生しました
          </p>
          <Button variant="primary" onClick={loadStats}>
            🔄 再読み込み
          </Button>
        </div>
      </div>
    );
  }

  const storageBreakdown = [
    {
      name: 'Standard',
      value: usageStats.storage.standard_gb,
      color: '#3b82f6',
      percentage: (usageStats.storage.standard_gb / usageStats.storage.total_gb) * 100,
    },
    {
      name: 'Archive (IA)',
      value: usageStats.storage.ia_gb,
      color: '#f59e0b',
      percentage: (usageStats.storage.ia_gb / usageStats.storage.total_gb) * 100,
    },
  ];

  const costBreakdown = [
    {
      category: 'ストレージ (Standard)',
      cost_usd: costDashboard.monthly_cost.storage_standard,
      color: '#3b82f6',
      description: 'Standard ストレージ料金',
    },
    {
      category: 'ストレージ (Archive)',
      cost_usd: costDashboard.monthly_cost.storage_ia,
      color: '#f59e0b',
      description: 'Archive ストレージ料金',
    },
    {
      category: 'オペレーション (Class A)',
      cost_usd: costDashboard.monthly_cost.operations_class_a,
      color: '#10b981',
      description: 'PUT/POST/DELETE 操作',
    },
    {
      category: 'オペレーション (Class B)',
      cost_usd: costDashboard.monthly_cost.operations_class_b,
      color: '#8b5cf6',
      description: 'GET/HEAD 操作',
    },
    {
      category: 'Archive取得',
      cost_usd: costDashboard.monthly_cost.ia_retrievals,
      color: '#ef4444',
      description: 'Archive データ取得料金',
    },
  ].filter(item => item.cost_usd > 0);

  const fileTypeStats = usageStats.file_types.map((type, index) => ({
    type: type.content_type.replace('image/', ''),
    count: type.count,
    total_size_gb: type.total_size / (1024 ** 3),
    color: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'][index % 5],
  }));

  const activityHistory = generateActivityHistory();
  const totalViews = activityHistory.reduce((sum, day) => sum + day.views, 0);
  const avgPhotosPerDay = activityHistory.reduce((sum, day) => sum + day.uploads, 0) / activityHistory.length;
  const mostActiveDay = activityHistory.reduce((max, day) => 
    day.uploads > max.uploads ? day : max
  ).date;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">統計・コスト監視</h1>
          <p className="text-gray-600">
            ストレージ使用量: {usageStats.storage.total_gb.toFixed(2)}GB • 
            月間コスト: ${costDashboard.monthly_cost.total_usd.toFixed(3)} • 
            {usageStats.storage.file_count}枚の写真
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="secondary" onClick={loadStats}>
            🔄 更新
          </Button>
          <Link to="/upload">
            <Button variant="primary">
              📤 写真をアップロード
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { key: 'overview', label: '📊 概要', desc: '全体統計' },
            { key: 'storage', label: '💾 ストレージ', desc: '使用量分析' },
            { key: 'cost', label: '💰 コスト', desc: '料金分析' },
            { key: 'activity', label: '📈 アクティビティ', desc: '利用状況' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div>{tab.label}</div>
              <div className="text-xs text-gray-400">{tab.desc}</div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">総使用量</p>
                  <p className="text-2xl font-bold">{usageStats.storage.total_gb.toFixed(2)}GB</p>
                </div>
                <span className="text-3xl">💾</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">月間コスト</p>
                  <p className="text-2xl font-bold">${costDashboard.monthly_cost.total_usd.toFixed(3)}</p>
                </div>
                <span className="text-3xl">💰</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">写真数</p>
                  <p className="text-2xl font-bold">{usageStats.storage.file_count}</p>
                </div>
                <span className="text-3xl">📸</span>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100">容量使用率</p>
                  <p className="text-2xl font-bold">{usageStats.quota_percentage.toFixed(1)}%</p>
                </div>
                <span className="text-3xl">📊</span>
              </div>
            </div>
          </div>

          {/* Quick Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StorageChart
              breakdown={storageBreakdown}
              usageHistory={generateStorageHistory()}
              totalUsage={usageStats.storage.total_gb}
              totalQuota={10} // 10GB free quota
            />
            <CostAnalysis
              currentMonthCost={costDashboard.monthly_cost.total_usd}
              projectedMonthEndCost={costDashboard.projection.month_end_total_usd}
              costBreakdown={costBreakdown}
              monthlyHistory={generateCostHistory()}
              savingsFromIA={0.02} // Mock savings
            />
          </div>
        </div>
      )}

      {activeTab === 'storage' && (
        <StorageChart
          breakdown={storageBreakdown}
          usageHistory={generateStorageHistory()}
          totalUsage={usageStats.storage.total_gb}
          totalQuota={10}
        />
      )}

      {activeTab === 'cost' && (
        <CostAnalysis
          currentMonthCost={costDashboard.monthly_cost.total_usd}
          projectedMonthEndCost={costDashboard.projection.month_end_total_usd}
          costBreakdown={costBreakdown}
          monthlyHistory={generateCostHistory()}
          savingsFromIA={0.02}
        />
      )}

      {activeTab === 'activity' && (
        <ActivityStats
          dailyActivity={activityHistory}
          fileTypeStats={fileTypeStats}
          totalPhotos={usageStats.storage.file_count}
          totalViews={totalViews}
          avgPhotosPerDay={avgPhotosPerDay}
          mostActiveDay={mostActiveDay}
        />
      )}
    </div>
  );
};

export default StatsPage;
