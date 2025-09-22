import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useFileUpload } from '../hooks/useFileUpload';
import { useNotifications } from '../hooks/useNotifications';
import { apiClient } from '../utils/api';
import Card from '../components/Card';
import Button from '../components/Button';
import FileDropZone from '../components/FileDropZone';
import UploadProgress from '../components/UploadProgress';
import UploadStats from '../components/UploadStats';
import type { UsageStats } from '../types';

const UploadPage: React.FC = () => {
  const {
    uploadQueue,
    isUploading,
    addFiles,
    removeFile,
    startUpload,
    clearCompleted,
    clearAll,
    getStats,
  } = useFileUpload();

  const { showError, showWarning } = useNotifications();
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const stats = getStats();

  // Load usage statistics
  useEffect(() => {
    const loadUsageStats = async () => {
      try {
        const data = await apiClient.getUsageStats();
        setUsageStats(data);
      } catch (error: any) {
        console.error('Failed to load usage stats:', error);
        showError('使用量統計の取得に失敗しました', error.message);
      } finally {
        setIsLoadingStats(false);
      }
    };

    loadUsageStats();
  }, [showError]);

  // Check quota before allowing upload
  const handleFilesSelected = (files: FileList) => {
    if (!usageStats) {
      showWarning('使用量統計を確認中です。しばらくお待ちください。');
      return;
    }

    // Calculate total size of new files
    const newFilesSize = Array.from(files).reduce((acc, file) => acc + file.size, 0);
    const newFilesSizeGB = newFilesSize / (1024 ** 3);
    
    // Check if adding these files would exceed quota
    const currentUsageGB = usageStats.storage.total_gb;
    const freeQuotaGB = usageStats.storage.free_quota_remaining;
    
    if (newFilesSizeGB > freeQuotaGB) {
      showError(
        '容量不足',
        `選択したファイル (${newFilesSizeGB.toFixed(2)}GB) は利用可能な容量 (${freeQuotaGB.toFixed(2)}GB) を超えています。`
      );
      return;
    }

    // Warn if approaching quota limit
    const afterUploadUsage = currentUsageGB + newFilesSizeGB;
    const quotaPercentage = (afterUploadUsage / 10) * 100; // Assuming 10GB free quota
    
    if (quotaPercentage > 90) {
      showWarning(
        '容量警告',
        `アップロード後の使用量が${quotaPercentage.toFixed(1)}%になります。容量の上限に近づいています。`
      );
    }

    addFiles(files);
  };

  const handleRetryUpload = (id: string) => {
    // Find the failed item and add it back to queue
    const item = uploadQueue.find(item => item.id === id);
    if (item) {
      // Reset the item status and progress
      const updatedQueue = uploadQueue.map(queueItem =>
        queueItem.id === id
          ? { ...queueItem, status: 'queued' as const, progress: 0, error: undefined }
          : queueItem
      );
      // This would typically be handled by the upload hook
      // For now, we'll just show a message
      showWarning('再試行機能は開発中です');
    }
  };

  const quotaPercentage = usageStats?.quota_percentage || 0;
  const isNearQuota = quotaPercentage > 80;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">写真アップロード</h1>
        <p className="text-gray-600">
          ドラッグ&ドロップまたはファイル選択で写真をアップロード
        </p>
      </div>

      {/* Storage Quota Warning */}
      {isNearQuota && usageStats && (
        <Card className="bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <span className="text-yellow-500 text-xl">⚠️</span>
            <div>
              <h3 className="font-medium text-yellow-800">容量警告</h3>
              <p className="text-sm text-yellow-700 mt-1">
                ストレージ使用量が {quotaPercentage.toFixed(1)}% に達しています。
                残り容量: {usageStats.storage.free_quota_remaining.toFixed(2)}GB
              </p>
              <Link to="/stats" className="text-sm text-yellow-600 hover:text-yellow-500 underline">
                詳細を確認 →
              </Link>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Drop Zone */}
          <FileDropZone
            onFilesSelected={handleFilesSelected}
            disabled={isUploading || isLoadingStats}
            className="h-48"
          />

          {/* Upload Controls */}
          {uploadQueue.length > 0 && (
            <Card>
              <div className="flex flex-wrap gap-3 justify-between items-center">
                <div className="flex gap-3">
                  <Button
                    variant="primary"
                    onClick={startUpload}
                    disabled={isUploading || stats.queued === 0}
                    loading={isUploading}
                  >
                    {isUploading ? 'アップロード中...' : `${stats.queued}個のファイルをアップロード`}
                  </Button>
                  
                  {stats.completed > 0 && (
                    <Button
                      variant="secondary"
                      onClick={clearCompleted}
                      disabled={isUploading}
                    >
                      完了済みをクリア
                    </Button>
                  )}
                </div>
                
                <Button
                  variant="danger"
                  onClick={clearAll}
                  disabled={isUploading}
                  size="sm"
                >
                  すべてクリア
                </Button>
              </div>
            </Card>
          )}

          {/* Upload Progress */}
          <UploadProgress
            items={uploadQueue}
            onRemove={removeFile}
            onRetry={handleRetryUpload}
          />

          {/* Empty State */}
          {uploadQueue.length === 0 && (
            <Card>
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📸</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  ファイルを選択してアップロード
                </h3>
                <p className="text-gray-600 mb-4">
                  上のドロップゾーンにファイルをドラッグするか、クリックしてファイルを選択してください
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                  <div className="p-3 bg-gray-50 rounded">
                    <strong>対応形式:</strong><br />
                    JPEG, PNG, WebP, HEIC
                  </div>
                  <div className="p-3 bg-gray-50 rounded">
                    <strong>最大サイズ:</strong><br />
                    500MB / ファイル
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upload Statistics */}
          {uploadQueue.length > 0 && (
            <UploadStats stats={stats} />
          )}

          {/* Storage Usage */}
          {usageStats && (
            <Card title="ストレージ使用量">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>使用量</span>
                    <span>{usageStats.storage.total_gb.toFixed(2)}GB / 10GB</span>
                  </div>
                  <div className="bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        isNearQuota ? 'bg-red-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(quotaPercentage, 100)}%` }}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Standard</p>
                    <p className="font-medium">{usageStats.storage.standard_gb.toFixed(2)}GB</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Archive</p>
                    <p className="font-medium">{usageStats.storage.ia_gb.toFixed(2)}GB</p>
                  </div>
                </div>
                
                <Link to="/stats">
                  <Button variant="secondary" size="sm" className="w-full">
                    詳細を見る
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Tips */}
          <Card title="💡 Tips">
            <div className="space-y-3 text-sm">
              <div className="p-3 bg-blue-50 rounded">
                <strong className="text-blue-900">自動処理</strong>
                <p className="text-blue-800 mt-1">
                  アップロード後、サムネイルと中サイズ画像が自動生成されます
                </p>
              </div>
              
              <div className="p-3 bg-green-50 rounded">
                <strong className="text-green-900">コスト最適化</strong>
                <p className="text-green-800 mt-1">
                  30日後に自動的にアーカイブ保存に移行してコストを削減
                </p>
              </div>
              
              <div className="p-3 bg-purple-50 rounded">
                <strong className="text-purple-900">EXIF データ</strong>
                <p className="text-purple-800 mt-1">
                  撮影日時、カメラ情報、位置情報が自動的に抽出・保存されます
                </p>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="クイックアクション">
            <div className="space-y-2">
              <Link to="/photos" className="block">
                <Button variant="secondary" size="sm" className="w-full">
                  📸 写真一覧を見る
                </Button>
              </Link>
              <Link to="/dashboard" className="block">
                <Button variant="secondary" size="sm" className="w-full">
                  🏠 ダッシュボードに戻る
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default UploadPage;
