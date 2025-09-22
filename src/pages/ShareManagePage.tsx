import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSharing } from '../hooks/useSharing';
import Card from '../components/Card';
import Button from '../components/Button';
import { formatShareInfo } from '../utils/sharing';
import { formatFileSize } from '../utils/api';

const ShareManagePage: React.FC = () => {
  const {
    shareLinks,
    getActiveShares,
    copyShareLink,
    shareToSocial,
    deactivateShare,
    removeExpiredShares,
  } = useSharing();

  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'inactive'>('all');
  const [sortBy, setSortBy] = useState<'created' | 'views' | 'expires'>('created');

  const activeShares = getActiveShares();
  
  const filteredShares = shareLinks.filter(link => {
    const now = new Date();
    const isExpired = link.options.expiresAt && now > link.options.expiresAt;
    const isViewLimitReached = link.options.maxViews && link.viewCount >= link.options.maxViews;
    const isActive = link.isActive && !isExpired && !isViewLimitReached;

    switch (filterStatus) {
      case 'active':
        return isActive;
      case 'expired':
        return isExpired || isViewLimitReached;
      case 'inactive':
        return !link.isActive;
      default:
        return true;
    }
  });

  const sortedShares = [...filteredShares].sort((a, b) => {
    switch (sortBy) {
      case 'views':
        return b.viewCount - a.viewCount;
      case 'expires':
        if (!a.options.expiresAt && !b.options.expiresAt) return 0;
        if (!a.options.expiresAt) return 1;
        if (!b.options.expiresAt) return -1;
        return a.options.expiresAt.getTime() - b.options.expiresAt.getTime();
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  const handleCopyLink = async (shareLink: any) => {
    await copyShareLink(shareLink);
  };

  const handleSocialShare = async (shareLink: any) => {
    // Mock photo name - in real app, get from photo data
    await shareToSocial(shareLink, '共有写真');
  };

  const handleDeactivate = async (shareId: string) => {
    if (window.confirm('この共有リンクを無効化しますか？この操作は取り消せません。')) {
      await deactivateShare(shareId);
    }
  };

  const handleCleanupExpired = () => {
    if (window.confirm('期限切れの共有リンクを削除しますか？')) {
      removeExpiredShares();
    }
  };

  const stats = {
    total: shareLinks.length,
    active: activeShares.length,
    expired: shareLinks.filter(link => {
      const now = new Date();
      return (link.options.expiresAt && now > link.options.expiresAt) ||
             (link.options.maxViews && link.viewCount >= link.options.maxViews);
    }).length,
    inactive: shareLinks.filter(link => !link.isActive).length,
    totalViews: shareLinks.reduce((sum, link) => sum + link.viewCount, 0),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">🔗 共有管理</h1>
              <p className="text-gray-600 mt-1">作成した共有リンクの管理と分析</p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={handleCleanupExpired}
                disabled={stats.expired === 0}
              >
                🗑️ 期限切れを削除
              </Button>
              <Link to="/photos">
                <Button variant="primary">
                  📸 写真に戻る
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
              <div className="text-sm text-gray-600">総共有数</div>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <div className="text-sm text-gray-600">アクティブ</div>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.expired}</div>
              <div className="text-sm text-gray-600">期限切れ</div>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.inactive}</div>
              <div className="text-sm text-gray-600">無効化済み</div>
            </div>
          </Card>
          
          <Card>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.totalViews}</div>
              <div className="text-sm text-gray-600">総閲覧数</div>
            </div>
          </Card>
        </div>

        {/* Filters and Sort */}
        <Card className="mb-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm font-medium text-gray-700">フィルター:</span>
              {[
                { key: 'all', label: 'すべて', count: stats.total },
                { key: 'active', label: 'アクティブ', count: stats.active },
                { key: 'expired', label: '期限切れ', count: stats.expired },
                { key: 'inactive', label: '無効化済み', count: stats.inactive },
              ].map(({ key, label, count }) => (
                <Button
                  key={key}
                  variant={filterStatus === key ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setFilterStatus(key as any)}
                >
                  {label} ({count})
                </Button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">並び順:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created">作成日時</option>
                <option value="views">閲覧数</option>
                <option value="expires">有効期限</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Share Links List */}
        {sortedShares.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔗</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filterStatus === 'all' ? '共有リンクがありません' : `${filterStatus}の共有リンクがありません`}
              </h3>
              <p className="text-gray-600">
                写真ページから新しい共有リンクを作成してください
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedShares.map((shareLink) => {
              const now = new Date();
              const isExpired = shareLink.options.expiresAt && now > shareLink.options.expiresAt;
              const isViewLimitReached = shareLink.options.maxViews && shareLink.viewCount >= shareLink.options.maxViews;
              const isActive = shareLink.isActive && !isExpired && !isViewLimitReached;

              return (
                <Card key={shareLink.id}>
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Share Link Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium text-gray-900">
                              写真ID: {shareLink.photoId}
                            </h3>
                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                              isActive 
                                ? 'bg-green-100 text-green-800'
                                : isExpired || isViewLimitReached
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {isActive ? '🟢 アクティブ' : isExpired || isViewLimitReached ? '🟡 期限切れ' : '🔴 無効'}
                            </div>
                          </div>
                          
                          <div className="text-sm font-mono bg-gray-100 p-2 rounded mb-2 break-all">
                            {shareLink.publicUrl}
                          </div>
                          
                          <div className="text-sm text-gray-600 space-y-1">
                            <div>{formatShareInfo(shareLink)}</div>
                            <div>
                              作成: {shareLink.createdAt.toLocaleDateString()} {shareLink.createdAt.toLocaleTimeString()} • 
                              閲覧: {shareLink.viewCount}回
                            </div>
                          </div>
                        </div>

                        {/* QR Code */}
                        {shareLink.qrCodeUrl && (
                          <div className="ml-4">
                            <img
                              src={shareLink.qrCodeUrl}
                              alt="QR Code"
                              className="w-16 h-16 border rounded"
                            />
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        {isActive && (
                          <>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleCopyLink(shareLink)}
                            >
                              📋 コピー
                            </Button>
                            
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleSocialShare(shareLink)}
                            >
                              📤 共有
                            </Button>
                            
                            <a
                              href={shareLink.publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                            >
                              👁️ プレビュー
                            </a>
                          </>
                        )}

                        {shareLink.isActive && (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeactivate(shareLink.id)}
                          >
                            🗑️ 無効化
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareManagePage;
