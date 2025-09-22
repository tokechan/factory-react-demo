import React from 'react';
import Card from './Card';

const DevModeInfo: React.FC = () => {
  // Only show in development mode
  if (process.env.NODE_ENV !== 'development' || process.env.REACT_APP_USE_MOCK_API !== 'true') {
    return null;
  }

  return (
    <Card className="bg-blue-50 border-blue-200 mb-6">
      <div className="flex items-start gap-3">
        <span className="text-blue-500 text-xl">🛠️</span>
        <div>
          <h3 className="font-medium text-blue-900 mb-2">開発モード - テストアカウント</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="p-2 bg-blue-100 rounded">
              <strong>デモアカウント:</strong><br />
              メール: demo@example.com<br />
              パスワード: password123
            </div>
            <div className="p-2 bg-blue-100 rounded">
              <strong>テストアカウント:</strong><br />
              メール: test@factory.com<br />
              パスワード: test123456
            </div>
            <p className="text-xs text-blue-600 mt-2">
              ※ 開発環境ではモックAPIを使用しており、実際のサーバーは不要です
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default DevModeInfo;
