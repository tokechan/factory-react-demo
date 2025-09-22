import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../hooks/useNotifications';
import { apiClient, formatFileSize, formatCurrency } from '../utils/api';
import Card from '../components/Card';
import Button from '../components/Button';
import type { UsageStats, Photo } from '../types';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { showError } = useNotifications();
  
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [recentPhotos, setRecentPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        
        // Load usage stats and recent photos in parallel
        const [statsResponse, photosResponse] = await Promise.all([
          apiClient.getUsageStats(),
          apiClient.getPhotos({ limit: 6, sort_by: 'upload_date', sort_order: 'desc' })
        ]);
        
        setUsageStats(statsResponse);
        setRecentPhotos(photosResponse.photos);
      } catch (error: any) {
        console.error('Failed to load dashboard data:', error);
        showError('データの読み込みに失敗しました', error.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [showError]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">ダッシュボードを読み込み中...</p>
        </div>
      </div>
    );
  }

  const quotaPercentage = usageStats?.quota_percentage || 0;
  const isNearQuota = quotaPercentage > 80;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="text-center md:text-left">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          お帰りなさい、{user?.email}さん！
        </h1>
        <p className="text-gray-600">
          写真アーカイブの状況を確認しましょう
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/upload">
          <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-3xl mb-2">📤</div>
            <p className="font-medium">アップロード</p>
            <p className="text-sm text-gray-600">写真を追加</p>
          </Card>
        </Link>
        
        <Link to="/photos">
          <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-3xl mb-2">📸</div>
            <p className="font-medium">写真一覧</p>
            <p className="text-sm text-gray-600">全ての写真</p>
          </Card>
        </Link>
        
        <Link to="/stats">
          <Card className="text-center hover:shadow-lg transition-shadow cursor-pointer">
            <div className="text-3xl mb-2">📊</div>
            <p className="font-medium">統計</p>
            <p className="text-sm text-gray-600">使用量・コスト</p>
          </Card>
        </Link>
        
        <Card className="text-center">
          <div className="text-3xl mb-2">⚡</div>
          <p className="font-medium">高速表示</p>
          <p className="text-sm text-gray-600">モバイル最適化</p>
        </Card>
      </div>

      {/* Usage Overview */}
      {usageStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Storage Usage */}
          <Card title="ストレージ使用量">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>使用量</span>
                  <span>{formatFileSize(usageStats.storage.total_gb * 1024 ** 3)} / 10GB</span>
                </div>
                <div className="bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${
                      isNearQuota ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                  />
                </div>
                {isNearQuota && (
                  <p className="text-xs text-red-600 mt-1">
                    容量の上限に近づいています
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Standard</p>
                  <p className="font-medium">{formatFileSize(usageStats.storage.standard_gb * 1024 ** 3)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Archive (IA)</p>
                  <p className="font-medium">{formatFileSize(usageStats.storage.ia_gb * 1024 ** 3)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Monthly Stats */}
          <Card title="今月の統計">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">アップロード数</span>
                <span className="font-medium">{usageStats.monthly_stats.uploads}枚</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">原本アクセス</span>
                <span className="font-medium">{usageStats.monthly_stats.original_accesses}回</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">総ファイル数</span>
                <span className="font-medium">{usageStats.storage.file_count}枚</span>
              </div>
            </div>
          </Card>

          {/* Cost Overview */}
          <Card title="月次コスト">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">ストレージ</span>
                <span className="font-medium">{formatCurrency(usageStats.monthly_cost.storage_usd)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">IA取得</span>
                <span className="font-medium">{formatCurrency(usageStats.monthly_stats.cost_incurred_usd)}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>合計</span>
                <span>{formatCurrency(usageStats.monthly_cost.total_usd)}</span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Recent Photos */}
      <Card 
        title="最近の写真" 
        actions={
          <Link to="/photos">
            <Button variant="secondary" size="sm">
              すべて表示
            </Button>
          </Link>
        }
      >
        {recentPhotos.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {recentPhotos.map((photo) => (
              <div key={photo.id} className="group cursor-pointer">
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                  {photo.thumb_url ? (
                    <img
                      src={photo.thumb_url}
                      alt={photo.filename}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <span className="text-2xl">📸</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-1 truncate">
                  {photo.filename}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📸</div>
            <p className="text-gray-600 mb-4">まだ写真がアップロードされていません</p>
            <Link to="/upload">
              <Button variant="primary">
                最初の写真をアップロード
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Tips */}
      <Card title="💡 Tips">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">コスト最適化</h4>
            <p className="text-sm text-blue-800">
              写真は30日後に自動的にアーカイブ（IA）に移動され、ストレージコストが33%削減されます。
            </p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-2">高速表示</h4>
            <p className="text-sm text-green-800">
              サムネイルが自動生成されるため、モバイルでも高速に写真を閲覧できます。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
