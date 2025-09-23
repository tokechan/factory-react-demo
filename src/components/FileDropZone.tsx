import React, { useCallback, useState, useRef } from 'react';
import { clsx } from 'clsx';

interface FileDropZoneProps {
  onFilesSelected: (files: FileList) => void;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  accept = 'image/*',
  multiple = true,
  disabled = false,
  className,
  children,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    // Simple drag leave handling
    setIsDragOver(false);
  }, [disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (disabled) return;
    
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
  }, [disabled, onFilesSelected]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFilesSelected]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  }, [handleClick]);

  return (
    <div
      className={clsx(
        'relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
        {
          'border-blue-400 bg-blue-50': isDragOver && !disabled,
          'border-gray-300 hover:border-gray-400': !isDragOver && !disabled,
          'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60': disabled,
        },
        className
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label="ファイルを選択またはドラッグ&ドロップ"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />
      
      {children || (
        <div className="p-8 text-center">
          <div className="text-4xl mb-4">
            {isDragOver ? '📥' : '📁'}
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-gray-700">
              {isDragOver ? 'ファイルをドロップしてください' : '写真をアップロード'}
            </p>
            <p className="text-sm text-gray-500">
              ドラッグ&ドロップまたはクリックしてファイルを選択
            </p>
            <p className="text-xs text-gray-400">
              JPEG, PNG, WebP, HEIC対応（最大500MB）
            </p>
          </div>
        </div>
      )}
      
      {isDragOver && (
        <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg flex items-center justify-center">
          <div className="text-blue-600 font-medium">
            ここにファイルをドロップ
          </div>
        </div>
      )}
    </div>
  );
};

export default FileDropZone;
