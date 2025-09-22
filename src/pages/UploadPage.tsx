import React from 'react';
import Card from '../components/Card';

const UploadPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">写真アップロード</h1>
        <p className="text-gray-600">ドラッグ&ドロップまたはファイル選択で写真をアップロード</p>
      </div>

      <Card>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📤</div>
          <p className="text-gray-600 mb-4">ファイルアップロード機能は実装中です</p>
          <p className="text-sm text-gray-500">
            ドラッグ&ドロップ、プログレスバー、プリサインドURL利用のアップロード機能を実装予定
          </p>
        </div>
      </Card>
    </div>
  );
};

export default UploadPage;
