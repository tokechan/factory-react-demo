import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import { createPreviewUrl, getImageMetadata, type ImageMetadata } from '../utils/imageProcessing';
import { formatFileSize } from '../utils/api';

interface ImagePreviewProps {
  file: File;
  onRemove?: () => void;
  showMetadata?: boolean;
  className?: string;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  file,
  onRemove,
  showMetadata = false,
  className,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [metadata, setMetadata] = useState<ImageMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const loadPreview = async () => {
      setIsLoading(true);
      setError('');

      try {
        // Generate preview and extract metadata in parallel
        const [preview, meta] = await Promise.all([
          createPreviewUrl(file),
          showMetadata ? getImageMetadata(file) : Promise.resolve(null)
        ]);

        setPreviewUrl(preview);
        if (meta) {
          setMetadata(meta);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load image preview');
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();

    // Cleanup preview URL on unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file, showMetadata, previewUrl]);

  const handleImageClick = useCallback(() => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  }, [previewUrl]);

  return (
    <div className={clsx('relative bg-white border rounded-lg overflow-hidden', className)}>
      {/* Remove Button */}
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 z-10 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
          title="削除"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="aspect-square bg-gray-100 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="aspect-square bg-gray-100 flex flex-col items-center justify-center text-gray-500 p-4">
          <div className="text-2xl mb-2">❌</div>
          <p className="text-xs text-center">{error}</p>
        </div>
      )}

      {/* Preview Image */}
      {previewUrl && !isLoading && !error && (
        <div
          className="aspect-square cursor-pointer hover:opacity-90 transition-opacity"
          onClick={handleImageClick}
        >
          <img
            src={previewUrl}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* File Info */}
      <div className="p-3">
        <div className="text-sm font-medium text-gray-900 truncate" title={file.name}>
          {file.name}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {formatFileSize(file.size)}
          {metadata && (
            <span> • {metadata.dimensions.width} × {metadata.dimensions.height}</span>
          )}
        </div>

        {/* Metadata Details */}
        {showMetadata && metadata && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
              📋 詳細情報
            </summary>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              <div className="grid grid-cols-2 gap-1">
                <span>形式:</span>
                <span>{metadata.mimeType}</span>
                
                <span>サイズ:</span>
                <span>{metadata.dimensions.width} × {metadata.dimensions.height}</span>
                
                <span>ファイルサイズ:</span>
                <span>{formatFileSize(metadata.fileSize)}</span>
                
                {metadata.colorProfile && (
                  <>
                    <span>カラープロファイル:</span>
                    <span>{metadata.colorProfile}</span>
                  </>
                )}
                
                {metadata.compression && (
                  <>
                    <span>圧縮:</span>
                    <span>{metadata.compression}</span>
                  </>
                )}
              </div>

              {/* EXIF Data */}
              {metadata.exifData && Object.keys(metadata.exifData).length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-gray-500 hover:text-gray-700">
                    EXIF データ
                  </summary>
                  <div className="mt-1 p-2 bg-gray-50 rounded text-xs">
                    <div className="max-h-20 overflow-auto">
                      {Object.entries(metadata.exifData).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="font-mono">{key}:</span>
                          <span className="truncate ml-2">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

export default ImagePreview;
