import React, { useState, useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { useSharing } from '../hooks/useSharing';
import Button from '../components/Button';
import Card from '../components/Card';
import { formatFileSize } from '../utils/api';
import { copyToClipboard } from '../utils/sharing';
import type { ShareAccess } from '../utils/sharing';

const ShareViewPage: React.FC = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const { accessShare } = useSharing();

  const [access, setAccess] = useState<ShareAccess | null>(null);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!shareId) return;

    const checkAccess = async () => {
      setIsLoading(true);
      setError('');

      try {
        const result = await accessShare(shareId);
        setAccess(result);

        if (result.requiresPassword) {
          setShowPasswordInput(true);
        }
      } catch (err: any) {
        setError(err.message || 'アクセスの確認中にエラーが発生しました');
      } finally {
        setIsLoading(false);
      }
    };

    checkAccess();
  }, [shareId, accessShare]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareId || !password.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const result = await accessShare(shareId, password);
      setAccess(result);

      if (!result.success) {
        setError(result.error || 'アクセスに失敗しました');
      }
    } catch (err: any) {
      setError(err.message || 'パスワード確認中にエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (photo: any) => {
    try {
      // In a real app, this would fetch the actual image data
      const response = await fetch(photo.url);
      const blob = await response.blob();
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = photo.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('ダウンロードに失敗しました');
    }
  };

  const handleCopyUrl = async () => {
    const success = await copyToClipboard(window.location.href);
    if (success) {
      alert('リンクをコピーしました');
    }
  };

  // Redirect if no shareId
  if (!shareId) {
    return <Navigate to="/" replace />;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">共有リンクを確認中...</p>
          </div>
        </Card>
      </div>
    );
  }

  // Password input
  if (showPasswordInput && (!access || access.requiresPassword)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card title="🔒 パスワードが必要です" className="w-full max-w-md">
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <p className="text-gray-600 text-sm mb-4">
                この共有リンクはパスワードで保護されています。
              </p>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="パスワードを入力してください"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              disabled={!password.trim() || isLoading}
              loading={isLoading}
            >
              アクセス
            </Button>
          </form>
        </Card>
      </div>
    );
  }

  // Error state
  if (!access || !access.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">アクセスできません</h2>
            <p className="text-gray-600 mb-4">
              {access?.error || error || '共有リンクにアクセスできませんでした。'}
            </p>
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/'}
            >
              ホームページに戻る
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Successfully accessed - show photo
  const photo = access.photoData;

  if (!photo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <div className="text-center py-8">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-xl font-medium text-gray-900 mb-2">データエラー</h2>
            <p className="text-gray-600 mb-4">
              写真データの取得に失敗しました。
            </p>
            <Button
              variant="secondary"
              onClick={() => window.location.href = '/'}
            >
              ホームページに戻る
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-xl font-medium text-gray-900">
              📤 共有された写真
            </h1>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyUrl}
              >
                🔗 リンクをコピー
              </Button>
              {access.photoData && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => window.location.href = '/'}
                >
                  🏠 ホーム
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Photo Display */}
          <div className="lg:col-span-2">
            <Card>
              <div className="space-y-4">
                {/* Photo */}
                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                  <img
                    src={photo.url}
                    alt={photo.name}
                    className="w-full h-auto object-contain max-h-[70vh]"
                    style={{
                      filter: photo.watermark ? 'opacity(0.9)' : 'none'
                    }}
                  />
                  
                  {/* Watermark overlay */}
                  {photo.watermark && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-sm">
                        🏷️ 共有画像
                      </div>
                    </div>
                  )}
                </div>

                {/* Photo Actions */}
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-medium text-gray-900">
                    {photo.name}
                  </h2>
                  
                  <div className="flex gap-2">
                    {photo.allowZoom && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const img = new Image();
                          img.src = photo.url;
                          const newWindow = window.open('', '_blank');
                          if (newWindow) {
                            newWindow.document.write(`
                              <html>
                                <head><title>${photo.name}</title></head>
                                <body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;">
                                  <img src="${photo.url}" style="max-width:100%;max-height:100vh;object-fit:contain;" alt="${photo.name}">
                                </body>
                              </html>
                            `);
                          }
                        }}
                      >
                        🔍 拡大表示
                      </Button>
                    )}
                    
                    {photo.allowDownload && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleDownload(photo)}
                      >
                        💾 ダウンロード
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Photo Info */}
          <div className="space-y-6">
            {/* Share Info */}
            <Card title="🔗 共有情報">
              <div className="space-y-3 text-sm">
                {access.viewsRemaining !== undefined && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="font-medium text-yellow-900">👁️ 残り閲覧回数</div>
                    <div className="text-yellow-800">{access.viewsRemaining}回</div>
                  </div>
                )}

                {access.expiresAt && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <div className="font-medium text-blue-900">⏰ 有効期限</div>
                    <div className="text-blue-800">
                      {access.expiresAt.toLocaleDateString()} {access.expiresAt.toLocaleTimeString()}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-gray-50 border border-gray-200 rounded">
                  <div className="font-medium text-gray-900">📋 制限事項</div>
                  <div className="text-gray-700 space-y-1">
                    {!photo.allowDownload && <div>• ダウンロード不可</div>}
                    {!photo.allowZoom && <div>• 拡大表示不可</div>}
                    {photo.watermark && <div>• 透かし入り</div>}
                    {photo.allowDownload && photo.allowZoom && !photo.watermark && <div>• 制限なし</div>}
                  </div>
                </div>
              </div>
            </Card>

            {/* Photo Details */}
            <Card title="📸 写真詳細">
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <span className="text-gray-600">ファイル名:</span>
                  <span className="font-medium break-all">{photo.name}</span>
                  
                  <span className="text-gray-600">サイズ:</span>
                  <span>{formatFileSize(photo.size)}</span>
                  
                  <span className="text-gray-600">寸法:</span>
                  <span>{photo.width} × {photo.height}</span>
                  
                  <span className="text-gray-600">形式:</span>
                  <span>{photo.content_type}</span>
                  
                  {photo.taken_at && (
                    <>
                      <span className="text-gray-600">撮影日:</span>
                      <span>{new Date(photo.taken_at).toLocaleDateString()}</span>
                    </>
                  )}
                </div>

                {/* EXIF Data */}
                {photo.metadata?.exif && Object.keys(photo.metadata.exif).length > 0 && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-gray-700 hover:text-gray-900 font-medium">
                      📋 撮影情報 (EXIF)
                    </summary>
                    <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                      <div className="grid grid-cols-2 gap-1">
                        {Object.entries(photo.metadata.exif).map(([key, value]) => (
                          <React.Fragment key={key}>
                            <span className="text-gray-600">{key}:</span>
                            <span className="break-all">{String(value)}</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </details>
                )}
              </div>
            </Card>

            {/* Powered by */}
            <div className="text-center text-xs text-gray-400">
              <div>📸 Photo Archive System で共有</div>
              <div className="mt-1">
                <a 
                  href="/" 
                  className="text-blue-500 hover:text-blue-600"
                >
                  自分の写真も管理してみる →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareViewPage;
