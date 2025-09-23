import React, { useState } from 'react';
import Button from './Button';
import Card from './Card';
import { useSharing } from '../hooks/useSharing';
import { formatShareInfo, generateSocialShareUrls } from '../utils/sharing';
import type { Photo } from '../types';

interface ShareDialogProps {
  photo: Photo;
  isOpen: boolean;
  onClose: () => void;
}

const ShareDialog: React.FC<ShareDialogProps> = ({ photo, isOpen, onClose }) => {
  const {
    createQuickShare,
    createSecureShare,
    copyShareLink,
    shareToSocial,
    getSharesByPhoto,
    deactivateShare,
    isLoading,
  } = useSharing();

  const [shareMode, setShareMode] = useState<'quick' | 'secure' | 'existing'>('quick');
  const [password, setPassword] = useState('');
  const [maxViews, setMaxViews] = useState(10);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const [showPassword, setShowPassword] = useState(false);

  const existingShares = getSharesByPhoto(photo.id);

  const handleQuickShare = async () => {
    const shareLink = await createQuickShare(photo.id, photo);
    if (shareLink) {
      await copyShareLink(shareLink);
    }
  };

  const handleSecureShare = async () => {
    if (!password.trim()) {
      alert('パスワードを入力してください');
      return;
    }

    const shareLink = await createSecureShare(
      photo.id,
      photo,
      password,
      maxViews,
      expiresInHours
    );

    if (shareLink) {
      await copyShareLink(shareLink);
      setPassword('');
    }
  };

  const handleSocialShare = async (shareLink: any) => {
    await shareToSocial(shareLink, photo.name);
  };

  const handleCopyLink = async (shareLink: any) => {
    await copyShareLink(shareLink);
  };

  const handleDeactivate = async (shareId: string) => {
    if (window.confirm('この共有リンクを無効化しますか？')) {
      await deactivateShare(shareId);
    }
  };

  const socialUrls = existingShares.length > 0 
    ? generateSocialShareUrls(existingShares[0].publicUrl, `写真「${photo.name}」を共有`)
    : null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <Card title={`📤 「${photo.name}」を共有`}>
          <div className="space-y-6">
            {/* Mode Selection */}
            <div className="flex space-x-2">
              <Button
                variant={shareMode === 'quick' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShareMode('quick')}
              >
                🚀 クイック共有
              </Button>
              <Button
                variant={shareMode === 'secure' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setShareMode('secure')}
              >
                🔒 セキュア共有
              </Button>
              {existingShares.length > 0 && (
                <Button
                  variant={shareMode === 'existing' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setShareMode('existing')}
                >
                  📋 既存の共有 ({existingShares.length})
                </Button>
              )}
            </div>

            {/* Quick Share */}
            {shareMode === 'quick' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-2">🚀 クイック共有</h3>
                  <p className="text-blue-800 text-sm mb-3">
                    誰でもアクセス可能なリンクを生成します（7日間有効）
                  </p>
                  <ul className="text-blue-700 text-xs space-y-1">
                    <li>• パスワード保護なし</li>
                    <li>• 7日後に自動期限切れ</li>
                    <li>• ダウンロード・拡大表示可能</li>
                    <li>• 透かしなし</li>
                  </ul>
                </div>
                
                <Button
                  variant="primary"
                  onClick={handleQuickShare}
                  disabled={isLoading}
                  loading={isLoading}
                  className="w-full"
                >
                  📋 リンクを作成してコピー
                </Button>
              </div>
            )}

            {/* Secure Share */}
            {shareMode === 'secure' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h3 className="font-medium text-green-900 mb-2">🔒 セキュア共有</h3>
                  <p className="text-green-800 text-sm mb-3">
                    パスワードと制限付きの安全なリンクを生成します
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      🔑 パスワード
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="パスワードを入力"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? '🙈' : '👁️'}
                      </button>
                    </div>
                  </div>

                  {/* Max Views */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      👁️ 最大閲覧回数
                    </label>
                    <input
                      type="number"
                      value={maxViews}
                      onChange={(e) => setMaxViews(parseInt(e.target.value) || 1)}
                      min="1"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  {/* Expiration */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ⏰ 有効期限
                    </label>
                    <select
                      value={expiresInHours}
                      onChange={(e) => setExpiresInHours(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value={1}>1時間</option>
                      <option value={6}>6時間</option>
                      <option value={24}>1日</option>
                      <option value={72}>3日</option>
                      <option value={168}>1週間</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                  <strong>セキュア設定:</strong> ダウンロード不可・透かし入り・拡大表示可能
                </div>

                <Button
                  variant="primary"
                  onClick={handleSecureShare}
                  disabled={isLoading || !password.trim()}
                  loading={isLoading}
                  className="w-full"
                >
                  🔒 セキュアリンクを作成してコピー
                </Button>
              </div>
            )}

            {/* Existing Shares */}
            {shareMode === 'existing' && existingShares.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">📋 既存の共有リンク</h3>
                
                {existingShares.map((shareLink) => (
                  <div key={shareLink.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="text-sm font-mono bg-gray-100 p-2 rounded mb-2 break-all">
                          {shareLink.publicUrl}
                        </div>
                        <div className="text-xs text-gray-600">
                          {formatShareInfo(shareLink)}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          作成: {shareLink.createdAt.toLocaleDateString()} • 
                          閲覧: {shareLink.viewCount}回
                        </div>
                      </div>
                    </div>

                    {/* QR Code */}
                    {shareLink.qrCodeUrl && (
                      <div className="mb-3">
                        <img
                          src={shareLink.qrCodeUrl}
                          alt="QR Code"
                          className="w-20 h-20 border rounded"
                        />
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
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

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeactivate(shareLink.id)}
                      >
                        🗑️ 無効化
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Social Media Links */}
                {socialUrls && (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">🌐 ソーシャルメディア共有</h4>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                      <a
                        href={socialUrls.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                      >
                        🐦 Twitter
                      </a>
                      <a
                        href={socialUrls.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-sm"
                      >
                        📘 Facebook
                      </a>
                      <a
                        href={socialUrls.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-3 py-2 bg-blue-700 text-white rounded hover:bg-blue-800 transition-colors text-sm"
                      >
                        💼 LinkedIn
                      </a>
                      <a
                        href={socialUrls.line}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
                      >
                        💬 LINE
                      </a>
                      <a
                        href={socialUrls.email}
                        className="flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors text-sm"
                      >
                        📧 Email
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* No existing shares message */}
            {shareMode === 'existing' && existingShares.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-2">📭</div>
                <p>この写真の共有リンクはまだありません</p>
                <p className="text-sm mt-1">上記のタブから新しい共有リンクを作成してください</p>
              </div>
            )}

            {/* Close Button */}
            <div className="flex justify-end pt-4 border-t">
              <Button variant="secondary" onClick={onClose}>
                閉じる
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ShareDialog;
