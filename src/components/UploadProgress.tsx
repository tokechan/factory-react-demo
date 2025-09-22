import React from 'react';
import { clsx } from 'clsx';
import { formatFileSize } from '../utils/api';
import Button from './Button';
import type { FileUploadItem } from '../types';

interface UploadProgressProps {
  items: FileUploadItem[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  className?: string;
}

const UploadProgress: React.FC<UploadProgressProps> = ({
  items,
  onRemove,
  onRetry,
  className,
}) => {
  if (items.length === 0) {
    return null;
  }

  const getStatusIcon = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'queued':
        return '⏳';
      case 'uploading':
        return '📤';
      case 'processing':
        return '⚙️';
      case 'completed':
        return '✅';
      case 'error':
        return '❌';
      default:
        return '📄';
    }
  };

  const getStatusText = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'queued':
        return '待機中';
      case 'uploading':
        return 'アップロード中';
      case 'processing':
        return '処理中';
      case 'completed':
        return '完了';
      case 'error':
        return 'エラー';
      default:
        return '';
    }
  };

  const getStatusColor = (status: FileUploadItem['status']) => {
    switch (status) {
      case 'queued':
        return 'text-gray-600';
      case 'uploading':
        return 'text-blue-600';
      case 'processing':
        return 'text-yellow-600';
      case 'completed':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className={clsx('space-y-3', className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="bg-white border rounded-lg p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-xl">{getStatusIcon(item.status)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.file.name}
                </p>
                <p className="text-xs text-gray-500">
                  {formatFileSize(item.file.size)} • {item.file.type}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={clsx('text-xs font-medium', getStatusColor(item.status))}>
                {getStatusText(item.status)}
              </span>
              
              {item.status === 'error' && onRetry && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRetry(item.id)}
                >
                  再試行
                </Button>
              )}
              
              {(item.status === 'queued' || item.status === 'error' || item.status === 'completed') && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onRemove(item.id)}
                >
                  削除
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {(item.status === 'uploading' || item.status === 'processing') && (
            <div className="mb-2">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>進捗</span>
                <span>{Math.round(item.progress)}%</span>
              </div>
              <div className="bg-gray-200 rounded-full h-2">
                <div
                  className={clsx(
                    'h-2 rounded-full transition-all duration-300',
                    {
                      'bg-blue-500': item.status === 'uploading',
                      'bg-yellow-500': item.status === 'processing',
                    }
                  )}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {item.status === 'error' && item.error && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {item.error}
            </div>
          )}

          {/* Success Message */}
          {item.status === 'completed' && item.photo_id && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              アップロード完了 • ID: {item.photo_id.slice(0, 8)}...
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UploadProgress;
