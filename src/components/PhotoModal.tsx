import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import { formatFileSize } from '../utils/api';
import Button from './Button';
import ShareDialog from './ShareDialog';
import type { Photo } from '../types';

interface PhotoModalProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (photoId: string) => void;
  onDownload?: (photo: Photo) => void;
}

const PhotoModal: React.FC<PhotoModalProps> = ({
  photo,
  isOpen,
  onClose,
  onDelete,
  onDownload,
}) => {
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [showOriginalWarning, setShowOriginalWarning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen && photo) {
      setIsImageLoading(true);
      setImageError(false);
      setShowOriginalWarning(false);
    }
  }, [isOpen, photo]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleViewOriginal = () => {
    if (photo?.storage_class === 'IA') {
      setShowOriginalWarning(true);
    } else {
      // In a real app, this would fetch the original URL
      window.open(photo?.medium_url, '_blank');
    }
  };

  const handleConfirmOriginal = () => {
    setShowOriginalWarning(false);
    // In a real app, this would fetch the original URL with IA retrieval cost
    window.open(photo?.medium_url, '_blank');
  };

  const handleDelete = async () => {
    if (!photo || !onDelete) return;
    
    if (window.confirm('この写真を削除しますか？この操作は取り消せません。')) {
      setIsDeleting(true);
      try {
        await onDelete(photo.id);
        onClose();
      } catch (error) {
        console.error('Delete failed:', error);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isOpen || !photo) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={handleBackdropClick}
    >
      <div className="relative bg-white rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
        >
          ✕
        </button>

        <div className="flex flex-col lg:flex-row max-h-[90vh]">
          {/* Image Section */}
          <div className="flex-1 relative bg-gray-100 flex items-center justify-center min-h-[300px] lg:min-h-[500px]">
            {isImageLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
              </div>
            )}

            {imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
                <div className="text-4xl mb-2">❌</div>
                <p>画像の読み込みに失敗しました</p>
              </div>
            )}

            <img
              src={photo.medium_url}
              alt={photo.filename}
              className={clsx(
                'max-w-full max-h-full object-contain transition-opacity duration-200',
                isImageLoading ? 'opacity-0' : 'opacity-100'
              )}
              onLoad={() => setIsImageLoading(false)}
              onError={() => {
                setIsImageLoading(false);
                setImageError(true);
              }}
            />
          </div>

          {/* Info Section */}
          <div className="w-full lg:w-80 p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-2 break-words">
                  {photo.filename}
                </h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ファイルサイズ:</span>
                    <span className="font-medium">{formatFileSize(photo.file_size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">形式:</span>
                    <span className="font-medium">{photo.content_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ストレージ:</span>
                    <span className={clsx(
                      'font-medium px-2 py-1 rounded text-xs',
                      photo.storage_class === 'IA' 
                        ? 'bg-orange-100 text-orange-800' 
                        : 'bg-green-100 text-green-800'
                    )}>
                      {photo.storage_class === 'IA' ? 'Archive' : 'Standard'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">閲覧回数:</span>
                    <span className="font-medium">{photo.view_count || 0}回</span>
                  </div>
                </div>
              </div>

              {/* Date Info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">📅 日時情報</h3>
                <div className="space-y-1 text-sm">
                  {photo.date_taken && (
                    <div>
                      <span className="text-gray-600">撮影日時:</span>
                      <div className="font-medium">{formatDate(photo.date_taken)}</div>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600">アップロード:</span>
                    <div className="font-medium">{formatDate(photo.upload_date)}</div>
                  </div>
                  {photo.ia_transition_date && (
                    <div>
                      <span className="text-gray-600">Archive移行:</span>
                      <div className="font-medium">{formatDate(photo.ia_transition_date)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Camera Info */}
              {photo.camera_model && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">📷 カメラ情報</h3>
                  <div className="text-sm">
                    <span className="font-medium">{photo.camera_model}</span>
                  </div>
                </div>
              )}

              {/* GPS Info */}
              {photo.gps_lat && photo.gps_lng && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">📍 位置情報</h3>
                  <div className="text-sm">
                    <div>緯度: {photo.gps_lat.toFixed(6)}</div>
                    <div>経度: {photo.gps_lng.toFixed(6)}</div>
                  </div>
                </div>
              )}

              {/* EXIF Data */}
              {photo.exif_data && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">📋 メタデータ</h3>
                  <div className="text-xs bg-gray-50 p-3 rounded border max-h-24 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(photo.exif_data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-4 border-t">
                <Button
                  variant="primary"
                  className="w-full"
                  onClick={handleViewOriginal}
                >
                  {photo.storage_class === 'IA' ? '⚠️ 原本を表示 (課金対象)' : '🔍 原本を表示'}
                </Button>

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowShareDialog(true)}
                >
                  🔗 共有
                </Button>

                {onDownload && (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => onDownload(photo)}
                  >
                    💾 ダウンロード
                  </Button>
                )}

                {onDelete && (
                  <Button
                    variant="danger"
                    className="w-full"
                    onClick={handleDelete}
                    loading={isDeleting}
                    disabled={isDeleting}
                  >
                    🗑️ 削除
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Original Warning Modal */}
        {showOriginalWarning && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Archive取得について
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  この写真はArchiveストレージに保存されています。原本を表示すると取得料金($0.01/GB)が発生します。
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowOriginalWarning(false)}
                  >
                    キャンセル
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={handleConfirmOriginal}
                  >
                    取得する
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Share Dialog */}
        {photo && (
          <ShareDialog
            photo={photo}
            isOpen={showShareDialog}
            onClose={() => setShowShareDialog(false)}
          />
        )}
      </div>
    </div>
  );
};

export default PhotoModal;
