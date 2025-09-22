import React from 'react';
import Card from '../components/Card';

const StatsPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">統計・コスト監視</h1>
        <p className="text-gray-600">ストレージ使用量とコストの詳細分析</p>
      </div>

      <Card>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <p className="text-gray-600 mb-4">統計ダッシュボードは実装中です</p>
          <p className="text-sm text-gray-500">
            詳細な使用量グラフ、コスト分析、アラート設定機能を実装予定
          </p>
        </div>
      </Card>
    </div>
  );
};

export default StatsPage;
