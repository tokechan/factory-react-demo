import React from 'react';
import { formatFileSize } from '../utils/api';
import Card from './Card';

interface UploadStatsProps {
  stats: {
    total: number;
    completed: number;
    failed: number;
    queued: number;
    uploading: number;
    totalSize: number;
  };
  className?: string;
}

const UploadStats: React.FC<UploadStatsProps> = ({ stats, className }) => {
  const successRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  return (
    <Card title="アップロード統計" className={className}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
          <div className="text-sm text-gray-600">総ファイル数</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
          <div className="text-sm text-gray-600">完了</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-yellow-600">{stats.queued + stats.uploading}</div>
          <div className="text-sm text-gray-600">処理中</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
          <div className="text-sm text-gray-600">失敗</div>
        </div>
      </div>
      
      {stats.total > 0 && (
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>成功率</span>
            <span>{successRate.toFixed(1)}%</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${successRate}%` }}
            />
          </div>
          
          <div className="mt-2 text-xs text-gray-500">
            総サイズ: {formatFileSize(stats.totalSize)}
          </div>
        </div>
      )}
    </Card>
  );
};

export default UploadStats;
