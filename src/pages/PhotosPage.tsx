import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../hooks/useNotifications';
import { apiClient } from '../utils/api';
import Button from '../components/Button';
import PhotoGrid from '../components/PhotoGrid';
import PhotoModal from '../components/PhotoModal';
import PhotoFilters from '../components/PhotoFilters';
import type { Photo, PhotoListResponse, PhotoSearchParams } from '../types';

const PhotosPage: React.FC = () => {
  const { showError, showSuccess } = useNotifications();
  
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchParams, setSearchParams] = useState<PhotoSearchParams>({
    sort_by: 'upload_date',
    sort_order: 'desc',
    limit: 50,
    page: 1,
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    has_next: false,
    has_prev: false,
  });

  // Load photos
  useEffect(() => {
    loadPhotos();
  }, [searchParams]);

  const loadPhotos = async () => {
    setIsLoading(true);
    try {
      const response: PhotoListResponse = await apiClient.getPhotos(searchParams);
      setPhotos(response.photos);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Failed to load photos:', error);
      showError('写真の読み込みに失敗しました', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (params: PhotoSearchParams) => {
    setSearchParams({
      ...params,
      limit: 50,
      page: 1,
    });
  };

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPhoto(null);
  };

  const handleDeletePhoto = async (photoId: string) => {
    try {
      // In a real app, this would call the delete API
      // await apiClient.deletePhoto(photoId);
      setPhotos(prev => prev.filter(photo => photo.id !== photoId));
      showSuccess('写真を削除しました');
    } catch (error: any) {
      showError('削除に失敗しました', error.message);
    }
  };

  const handleDownloadPhoto = (photo: Photo) => {
    // In a real app, this would get a presigned download URL
    window.open(photo.medium_url, '_blank');
    showSuccess('ダウンロードを開始しました');
  };

  const handlePageChange = (newPage: number) => {
    setSearchParams(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleLoadMore = () => {
    if (pagination.has_next) {
      handlePageChange(pagination.current_page + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">写真一覧</h1>
          <p className="text-gray-600">
            {pagination.total_count > 0 
              ? `${pagination.total_count}枚の写真を管理しています`
              : 'アップロードした写真を閲覧・管理できます'
            }
          </p>
        </div>
        
        <Link to="/upload">
          <Button variant="primary">
            📤 写真をアップロード
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <PhotoFilters 
        onSearch={handleSearch} 
        loading={isLoading}
      />

      {/* Results Summary */}
      {!isLoading && pagination.total_count > 0 && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {pagination.total_count}件中 {((pagination.current_page - 1) * (searchParams.limit || 50)) + 1}-
            {Math.min(pagination.current_page * (searchParams.limit || 50), pagination.total_count)}件を表示
          </span>
          <div className="flex items-center gap-4">
            {Object.keys(searchParams).length > 2 && (
              <span className="text-blue-600 font-medium">🎯 フィルタ適用中</span>
            )}
            <span>
              {pagination.total_pages > 1 && `${pagination.current_page}/${pagination.total_pages}ページ`}
            </span>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <PhotoGrid
        photos={photos}
        loading={isLoading}
        onPhotoClick={handlePhotoClick}
      />

      {/* Pagination */}
      {!isLoading && pagination.total_pages > 1 && (
        <div className="flex justify-center items-center gap-4 pt-8">
          <Button
            variant="secondary"
            onClick={() => handlePageChange(pagination.current_page - 1)}
            disabled={!pagination.has_prev}
          >
            ← 前のページ
          </Button>
          
          <span className="text-sm text-gray-600">
            {pagination.current_page} / {pagination.total_pages}
          </span>
          
          <Button
            variant="secondary"
            onClick={() => handlePageChange(pagination.current_page + 1)}
            disabled={!pagination.has_next}
          >
            次のページ →
          </Button>
        </div>
      )}

      {/* Load More Button (Alternative to pagination) */}
      {!isLoading && pagination.has_next && pagination.current_page === 1 && (
        <div className="flex justify-center pt-8">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            className="px-8"
          >
            📸 さらに写真を読み込む
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && photos.length === 0 && (
        <div className="flex justify-center items-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-4"></div>
            <p className="text-gray-600">写真を読み込み中...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && photos.length === 0 && pagination.total_count === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-6">📸</div>
          <h3 className="text-xl font-medium text-gray-900 mb-4">
            まだ写真がありません
          </h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            写真をアップロードして、あなたの思い出を整理しましょう。
            ドラッグ&ドロップで簡単にアップロードできます。
          </p>
          <Link to="/upload">
            <Button variant="primary" className="px-8">
              📤 最初の写真をアップロード
            </Button>
          </Link>
        </div>
      )}

      {/* No Search Results */}
      {!isLoading && photos.length === 0 && pagination.total_count > 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-6">🔍</div>
          <h3 className="text-xl font-medium text-gray-900 mb-4">
            検索結果が見つかりません
          </h3>
          <p className="text-gray-600 mb-6">
            検索条件を変更して再度お試しください
          </p>
          <Button 
            variant="secondary"
            onClick={() => handleSearch({ sort_by: 'upload_date', sort_order: 'desc' })}
          >
            🔄 すべての写真を表示
          </Button>
        </div>
      )}

      {/* Photo Detail Modal */}
      <PhotoModal
        photo={selectedPhoto}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onDelete={handleDeletePhoto}
        onDownload={handleDownloadPhoto}
      />
    </div>
  );
};

export default PhotosPage;
