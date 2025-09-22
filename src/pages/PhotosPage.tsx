import React from 'react';
import Card from '../components/Card';

const PhotosPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">写真一覧</h1>
        <p className="text-gray-600">アップロードした写真を閲覧・管理できます</p>
      </div>

      <Card>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">🏗️</div>
          <p className="text-gray-600 mb-4">写真ギャラリー機能は実装中です</p>
          <p className="text-sm text-gray-500">
            写真の一覧表示、検索、フィルタリング機能を実装予定
          </p>
        </div>
      </Card>
    </div>
  );
};

export default PhotosPage;
