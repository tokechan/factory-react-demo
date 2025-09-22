import { useState, useCallback } from 'react';
import { useNotifications } from './useNotifications';
import { apiClient } from '../utils/api';
import type { FileUploadItem } from '../types';

export const useFileUpload = () => {
  const [uploadQueue, setUploadQueue] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { showError, showSuccess, showWarning } = useNotifications();

  // File validation
  const validateFile = useCallback((file: File): { isValid: boolean; error?: string } => {
    // File size check (max 500MB for demonstration)
    const maxSize = 500 * 1024 * 1024; // 500MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `ファイルサイズが大きすぎます (${(file.size / (1024 * 1024)).toFixed(1)}MB > 500MB)`
      };
    }

    // File type check
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif'
    ];

    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: `サポートされていないファイル形式です (${file.type})`
      };
    }

    return { isValid: true };
  }, []);

  // Add files to upload queue
  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newItems: FileUploadItem[] = [];

    fileArray.forEach((file) => {
      const validation = validateFile(file);
      
      if (validation.isValid) {
        const item: FileUploadItem = {
          id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          file,
          progress: 0,
          status: 'queued',
        };
        newItems.push(item);
      } else {
        showError(`${file.name}: ${validation.error}`);
      }
    });

    if (newItems.length > 0) {
      setUploadQueue(prev => [...prev, ...newItems]);
      showSuccess(`${newItems.length}個のファイルをアップロードキューに追加しました`);
    }
  }, [validateFile, showError, showSuccess]);

  // Remove file from queue
  const removeFile = useCallback((id: string) => {
    setUploadQueue(prev => prev.filter(item => item.id !== id));
  }, []);

  // Update file progress
  const updateProgress = useCallback((id: string, progress: number, status?: FileUploadItem['status']) => {
    setUploadQueue(prev => prev.map(item => 
      item.id === id 
        ? { ...item, progress, status: status || item.status }
        : item
    ));
  }, []);

  // Extract EXIF data from image file
  const extractEXIFData = useCallback(async (file: File): Promise<Record<string, any> | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      img.onload = () => {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx?.drawImage(img, 0, 0);

        // Basic EXIF data extraction (simplified)
        const exifData = {
          dimensions: {
            width: img.naturalWidth,
            height: img.naturalHeight,
          },
          file_size: file.size,
          content_type: file.type,
          date_taken: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
        };

        resolve(exifData);
      };

      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Upload single file
  const uploadFile = useCallback(async (item: FileUploadItem): Promise<void> => {
    try {
      updateProgress(item.id, 0, 'uploading');

      // Extract EXIF data
      const exifData = await extractEXIFData(item.file);

      // Get presigned URL
      const presignedResponse = await apiClient.getPresignedUploadUrl({
        filename: item.file.name,
        file_size: item.file.size,
        content_type: item.file.type,
        exif_data: exifData || undefined,
      });

      // Show quota warning if any
      if (presignedResponse.quota_warning) {
        showWarning('容量警告', presignedResponse.quota_warning);
      }

      updateProgress(item.id, 10, 'uploading');

      // Upload file
      const etag = await apiClient.uploadFile(
        presignedResponse.upload_url,
        item.file,
        (progress) => {
          // Scale progress from 10% to 90% during upload
          const scaledProgress = 10 + (progress * 0.8);
          updateProgress(item.id, scaledProgress, 'uploading');
        }
      );

      updateProgress(item.id, 90, 'processing');

      // Complete upload
      await apiClient.completeUpload(
        presignedResponse.photo_id,
        etag,
        item.file.size
      );

      updateProgress(item.id, 100, 'completed');
      
      // Store photo_id for future reference
      setUploadQueue(prev => prev.map(queueItem => 
        queueItem.id === item.id 
          ? { ...queueItem, photo_id: presignedResponse.photo_id }
          : queueItem
      ));

      showSuccess(`${item.file.name} のアップロードが完了しました`);

    } catch (error: any) {
      console.error('Upload failed:', error);
      updateProgress(item.id, 0, 'error');
      
      setUploadQueue(prev => prev.map(queueItem => 
        queueItem.id === item.id 
          ? { ...queueItem, error: error.message || 'アップロードに失敗しました' }
          : queueItem
      ));

      showError(`${item.file.name}: ${error.message || 'アップロードに失敗しました'}`);
    }
  }, [updateProgress, extractEXIFData, showWarning, showSuccess, showError]);

  // Start upload process
  const startUpload = useCallback(async () => {
    const queuedItems = uploadQueue.filter(item => item.status === 'queued');
    
    if (queuedItems.length === 0) {
      showWarning('アップロードするファイルがありません');
      return;
    }

    setIsUploading(true);

    try {
      // Upload files sequentially to avoid overwhelming the server
      for (const item of queuedItems) {
        await uploadFile(item);
      }
    } finally {
      setIsUploading(false);
    }
  }, [uploadQueue, uploadFile, showWarning]);

  // Clear completed/errored files
  const clearCompleted = useCallback(() => {
    setUploadQueue(prev => prev.filter(item => 
      item.status !== 'completed' && item.status !== 'error'
    ));
  }, []);

  // Clear all files
  const clearAll = useCallback(() => {
    if (isUploading) {
      showWarning('アップロード中はキューをクリアできません');
      return;
    }
    setUploadQueue([]);
  }, [isUploading, showWarning]);

  // Get upload statistics
  const getStats = useCallback(() => {
    const total = uploadQueue.length;
    const completed = uploadQueue.filter(item => item.status === 'completed').length;
    const failed = uploadQueue.filter(item => item.status === 'error').length;
    const queued = uploadQueue.filter(item => item.status === 'queued').length;
    const uploading = uploadQueue.filter(item => item.status === 'uploading' || item.status === 'processing').length;

    return {
      total,
      completed,
      failed,
      queued,
      uploading,
      totalSize: uploadQueue.reduce((acc, item) => acc + item.file.size, 0),
    };
  }, [uploadQueue]);

  return {
    uploadQueue,
    isUploading,
    addFiles,
    removeFile,
    startUpload,
    clearCompleted,
    clearAll,
    getStats,
  };
};
