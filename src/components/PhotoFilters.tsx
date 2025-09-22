import React, { useState } from 'react';
import { clsx } from 'clsx';
import Button from './Button';
import Input from './Input';
import type { PhotoSearchParams } from '../types';

interface PhotoFiltersProps {
  onSearch: (params: PhotoSearchParams) => void;
  loading?: boolean;
  className?: string;
}

const PhotoFilters: React.FC<PhotoFiltersProps> = ({
  onSearch,
  loading = false,
  className,
}) => {
  const [filters, setFilters] = useState<PhotoSearchParams>({
    search: '',
    date_from: '',
    date_to: '',
    storage_class: '',
    sort_by: 'upload_date',
    sort_order: 'desc',
  });

  const [isExpanded, setIsExpanded] = useState(false);

  const handleFilterChange = (key: keyof PhotoSearchParams, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSearch = () => {
    // Remove empty values
    const cleanFilters: PhotoSearchParams = {};
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        cleanFilters[key as keyof PhotoSearchParams] = value;
      }
    });

    onSearch(cleanFilters);
  };

  const handleReset = () => {
    const resetFilters: PhotoSearchParams = {
      search: '',
      date_from: '',
      date_to: '',
      storage_class: '',
      sort_by: 'upload_date',
      sort_order: 'desc',
    };
    
    setFilters(resetFilters);
    onSearch({ sort_by: 'upload_date', sort_order: 'desc' });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'sort_by' && value === 'upload_date') return false;
    if (key === 'sort_order' && value === 'desc') return false;
    return value && value.trim() !== '';
  });

  return (
    <div className={clsx('bg-white border rounded-lg p-4', className)}>
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="ファイル名で検索..."
            value={filters.search || ''}
            onChange={(value) => handleFilterChange('search', value as string)}
            className="w-full"
          />
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="primary"
            onClick={handleSearch}
            loading={loading}
            disabled={loading}
          >
            🔍 検索
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '📊 詳細を隠す' : '📊 詳細フィルタ'}
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="space-y-4 pt-4 border-t">
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📅 撮影日・アップロード日
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">開始日</label>
                <Input
                  type="date"
                  value={filters.date_from || ''}
                  onChange={(value) => handleFilterChange('date_from', value as string)}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">終了日</label>
                <Input
                  type="date"
                  value={filters.date_to || ''}
                  onChange={(value) => handleFilterChange('date_to', value as string)}
                />
              </div>
            </div>
          </div>

          {/* Storage Class */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              💾 ストレージクラス
            </label>
            <select
              value={filters.storage_class || ''}
              onChange={(e) => handleFilterChange('storage_class', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">すべて</option>
              <option value="Standard">Standard (通常)</option>
              <option value="IA">Archive (アーカイブ)</option>
            </select>
          </div>

          {/* Sort Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📋 並び順
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">並び基準</label>
                <select
                  value={filters.sort_by || 'upload_date'}
                  onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="upload_date">アップロード日時</option>
                  <option value="date_taken">撮影日時</option>
                  <option value="filename">ファイル名</option>
                  <option value="file_size">ファイルサイズ</option>
                  <option value="view_count">閲覧回数</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">順序</label>
                <select
                  value={filters.sort_order || 'desc'}
                  onChange={(e) => handleFilterChange('sort_order', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="desc">新しい順</option>
                  <option value="asc">古い順</option>
                </select>
              </div>
            </div>
          </div>

          {/* Filter Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <span className="text-sm text-blue-600 font-medium">
                  🎯 フィルタ適用中
                </span>
              )}
            </div>
            
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleReset}
                >
                  🔄 リセット
                </Button>
              )}
              <Button
                variant="primary"
                size="sm"
                onClick={handleSearch}
                loading={loading}
                disabled={loading}
              >
                適用
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && !isExpanded && (
        <div className="pt-3 border-t">
          <div className="flex flex-wrap gap-2">
            {filters.search && (
              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                検索: {filters.search}
              </span>
            )}
            {filters.date_from && (
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                開始: {filters.date_from}
              </span>
            )}
            {filters.date_to && (
              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                終了: {filters.date_to}
              </span>
            )}
            {filters.storage_class && (
              <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                {filters.storage_class === 'IA' ? 'Archive' : 'Standard'}
              </span>
            )}
            <button
              onClick={handleReset}
              className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded hover:bg-gray-200 transition-colors"
            >
              ✕ クリア
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoFilters;
