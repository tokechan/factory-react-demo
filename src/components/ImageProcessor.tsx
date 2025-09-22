import React, { useState, useCallback } from 'react';
import { clsx } from 'clsx';
import Button from './Button';
import Card from './Card';
import {
  processImageForUpload,
  validateImageFile,
  getCompressionRatio,
  estimateProcessingTime,
  createPreviewUrl,
  downloadProcessedImage,
  type ImageMetadata,
  type ProcessedImage,
} from '../utils/imageProcessing';
import { formatFileSize } from '../utils/api';

interface ProcessingResult {
  original: ProcessedImage;
  thumbnail: ProcessedImage | null;
  medium: ProcessedImage | null;
  metadata: ImageMetadata;
}

interface ImageProcessorProps {
  files: FileList | File[];
  onProcessingComplete?: (results: ProcessingResult[]) => void;
  onError?: (error: string) => void;
  className?: string;
}

const ImageProcessor: React.FC<ImageProcessorProps> = ({
  files,
  onProcessingComplete,
  onError,
  className,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [results, setResults] = useState<ProcessingResult[]>([]);
  const [currentFile, setCurrentFile] = useState<string>('');
  const [previews, setPreviews] = useState<{ [key: string]: string }>({});

  const handleProcessing = useCallback(async () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setResults([]);
    setPreviews({});

    const fileArray = Array.from(files);
    const processedResults: ProcessingResult[] = [];

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        setCurrentFile(file.name);
        setProcessingProgress((i / fileArray.length) * 100);

        // Validate file
        const validation = validateImageFile(file);
        if (!validation.valid) {
          onError?.(validation.error || 'Invalid file');
          continue;
        }

        // Generate preview
        try {
          const previewUrl = await createPreviewUrl(file);
          setPreviews(prev => ({ ...prev, [file.name]: previewUrl }));
        } catch (error) {
          console.warn('Failed to generate preview for:', file.name);
        }

        // Process image
        const result = await processImageForUpload(file);
        processedResults.push(result);
      }

      setResults(processedResults);
      setProcessingProgress(100);
      onProcessingComplete?.(processedResults);
    } catch (error: any) {
      onError?.(error.message || 'Processing failed');
    } finally {
      setIsProcessing(false);
      setCurrentFile('');
    }
  }, [files, onProcessingComplete, onError]);

  const handleDownload = useCallback((result: ProcessingResult, variant: 'original' | 'thumbnail' | 'medium') => {
    const { original, thumbnail, medium } = result;
    let processedImage: ProcessedImage;
    let suffix: string;

    switch (variant) {
      case 'thumbnail':
        if (!thumbnail) return;
        processedImage = thumbnail;
        suffix = '_thumb';
        break;
      case 'medium':
        if (!medium) return;
        processedImage = medium;
        suffix = '_medium';
        break;
      default:
        processedImage = original;
        suffix = '';
    }

    const originalFile = Array.from(files).find(f => f.size === original.size);
    const baseName = originalFile?.name.replace(/\.[^/.]+$/, '') || 'image';
    const extension = processedImage.blob.type.split('/')[1];
    const filename = `${baseName}${suffix}.${extension}`;

    downloadProcessedImage(processedImage.blob, filename);
  }, [files]);

  if (files.length === 0) {
    return null;
  }

  return (
    <Card title="🖼️ 画像処理" className={className}>
      <div className="space-y-6">
        {/* Processing Controls */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">
              {files.length}個のファイルを処理
            </p>
            {isProcessing && currentFile && (
              <p className="text-xs text-blue-600">
                処理中: {currentFile}
              </p>
            )}
          </div>
          
          <Button
            variant="primary"
            onClick={handleProcessing}
            disabled={isProcessing}
            loading={isProcessing}
          >
            {isProcessing ? '処理中...' : '🔄 画像を処理'}
          </Button>
        </div>

        {/* Processing Progress */}
        {isProcessing && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>進捗</span>
              <span>{Math.round(processingProgress)}%</span>
            </div>
            <div className="bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${processingProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Processing Results */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">処理結果</h3>
            
            {results.map((result, index) => {
              const originalFile = Array.from(files)[index];
              const preview = previews[originalFile.name];
              
              return (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex flex-col lg:flex-row gap-4">
                    {/* Preview */}
                    {preview && (
                      <div className="lg:w-32 h-32 flex-shrink-0">
                        <img
                          src={preview}
                          alt={originalFile.name}
                          className="w-full h-full object-cover rounded border"
                        />
                      </div>
                    )}

                    <div className="flex-1 space-y-3">
                      {/* File Info */}
                      <div>
                        <h4 className="font-medium text-gray-900">{originalFile.name}</h4>
                        <p className="text-sm text-gray-600">
                          {result.metadata.dimensions.width} × {result.metadata.dimensions.height} px •{' '}
                          {formatFileSize(result.original.size)}
                        </p>
                      </div>

                      {/* Processing Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        {/* Original */}
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="font-medium text-gray-900">📄 原本</div>
                          <div className="text-gray-600">
                            {formatFileSize(result.original.size)}
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            className="mt-2 w-full"
                            onClick={() => handleDownload(result, 'original')}
                          >
                            ダウンロード
                          </Button>
                        </div>

                        {/* Thumbnail */}
                        {result.thumbnail && (
                          <div className="bg-blue-50 p-3 rounded">
                            <div className="font-medium text-blue-900">🖼️ サムネイル</div>
                            <div className="text-blue-700">
                              {result.thumbnail.dimensions.width} × {result.thumbnail.dimensions.height}
                            </div>
                            <div className="text-blue-600 text-xs">
                              {formatFileSize(result.thumbnail.size)} •{' '}
                              {getCompressionRatio(result.original.size, result.thumbnail.size).toFixed(1)}% 削減
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mt-2 w-full"
                              onClick={() => handleDownload(result, 'thumbnail')}
                            >
                              ダウンロード
                            </Button>
                          </div>
                        )}

                        {/* Medium */}
                        {result.medium && (
                          <div className="bg-green-50 p-3 rounded">
                            <div className="font-medium text-green-900">📷 中サイズ</div>
                            <div className="text-green-700">
                              {result.medium.dimensions.width} × {result.medium.dimensions.height}
                            </div>
                            <div className="text-green-600 text-xs">
                              {formatFileSize(result.medium.size)} •{' '}
                              {getCompressionRatio(result.original.size, result.medium.size).toFixed(1)}% 削減
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              className="mt-2 w-full"
                              onClick={() => handleDownload(result, 'medium')}
                            >
                              ダウンロード
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* EXIF Data */}
                      {result.metadata.exifData && Object.keys(result.metadata.exifData).length > 0 && (
                        <details className="text-sm">
                          <summary className="cursor-pointer text-gray-700 hover:text-gray-900">
                            📋 EXIF データを表示
                          </summary>
                          <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                            <pre className="whitespace-pre-wrap overflow-auto max-h-32">
                              {JSON.stringify(result.metadata.exifData, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Processing Stats */}
        {results.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">📊 処理統計</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-blue-700 font-medium">処理ファイル数</div>
                <div className="text-blue-900">{results.length}個</div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">生成バリエーション</div>
                <div className="text-blue-900">
                  {results.reduce((acc, r) => acc + (r.thumbnail ? 1 : 0) + (r.medium ? 1 : 0), 0)}個
                </div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">総削減サイズ</div>
                <div className="text-blue-900">
                  {formatFileSize(
                    results.reduce((acc, r) => {
                      const saved = r.thumbnail ? (r.original.size - r.thumbnail.size) : 0;
                      return acc + saved;
                    }, 0)
                  )}
                </div>
              </div>
              <div>
                <div className="text-blue-700 font-medium">平均圧縮率</div>
                <div className="text-blue-900">
                  {results.length > 0
                    ? (results.reduce((acc, r) => {
                        return acc + (r.thumbnail 
                          ? getCompressionRatio(r.original.size, r.thumbnail.size) 
                          : 0);
                      }, 0) / results.filter(r => r.thumbnail).length).toFixed(1)
                    : 0}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ImageProcessor;
