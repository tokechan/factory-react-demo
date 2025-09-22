import React, { useState } from 'react';
import { clsx } from 'clsx';
import type { Photo } from '../types';
import { formatFileSize } from '../utils/api';

interface PhotoGridProps {
  photos: Photo[];
  loading?: boolean;
  onPhotoClick?: (photo: Photo) => void;
  className?: string;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  loading = false,
  onPhotoClick,
  className,
}) => {
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  const handleImageLoad = (photoId: string) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
  };

  const handleImageError = (photoId: string) => {
    setLoadingImages(prev => {
      const newSet = new Set(prev);
      newSet.delete(photoId);
      return newSet;
    });
    setFailedImages(prev => new Set(prev).add(photoId));
  };

  const handleImageLoadStart = (photoId: string) => {
    setLoadingImages(prev => new Set(prev).add(photoId));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className={clsx('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4', className)}>
        {Array.from({ length: 20 }).map((_, index) => (
          <div key={index} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className={clsx('text-center py-16', className)}>
        <div className="text-6xl mb-4">📸</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          写真がありません
        </h3>
        <p className="text-gray-600 mb-4">
          まずは写真をアップロードしてギャラリーを始めましょう
        </p>
        <a
          href="/upload"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          📤 写真をアップロード
        </a>
      </div>
    );
  }

  return (
    <div className={clsx('grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4', className)}>
      {photos.map((photo) => {
        const isLoading = loadingImages.has(photo.id);
        const isFailed = failedImages.has(photo.id);

        return (
          <div
            key={photo.id}
            className={clsx(
              'group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer',
              'transform transition-all duration-200 hover:scale-[1.02] hover:shadow-lg',
              'ring-2 ring-transparent hover:ring-blue-300'
            )}
            onClick={() => onPhotoClick?.(photo)}
          >
            {/* Loading State */}
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
              </div>
            )}

            {/* Error State */}
            {isFailed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-500">
                <div className="text-2xl mb-1">❌</div>
                <div className="text-xs text-center px-2">
                  読み込み失敗
                </div>
              </div>
            )}

            {/* Photo Image */}
            {!isFailed && (
              <img
                src={photo.thumb_url}
                alt={photo.filename}
                className={clsx(
                  'w-full h-full object-cover transition-opacity duration-200',
                  isLoading ? 'opacity-0' : 'opacity-100'
                )}
                onLoadStart={() => handleImageLoadStart(photo.id)}
                onLoad={() => handleImageLoad(photo.id)}
                onError={() => handleImageError(photo.id)}
                loading="lazy"
              />
            )}

            {/* Overlay with Info */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                <p className="text-sm font-medium truncate mb-1">
                  {photo.filename}
                </p>
                <div className="flex justify-between items-center text-xs opacity-90">
                  <span>{formatDate(photo.date_taken || photo.upload_date)}</span>
                  <span>{formatFileSize(photo.file_size)}</span>
                </div>
              </div>
            </div>

            {/* Storage Class Badge */}
            {photo.storage_class === 'IA' && (
              <div className="absolute top-2 left-2 px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded">
                Archive
              </div>
            )}

            {/* Camera Model Badge */}
            {photo.camera_model && (
              <div className="absolute top-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                📷 {photo.camera_model}
              </div>
            )}

            {/* View Count */}
            {photo.view_count > 0 && (
              <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 bg-black/70 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                👁️ {photo.view_count}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default PhotoGrid;
