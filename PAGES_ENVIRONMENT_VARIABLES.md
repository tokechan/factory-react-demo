# Cloudflare Pages Environment Variables

## Production Environment Variables

以下の環境変数をCloudflare Pagesの設定で追加してください：

### 🔧 Core Configuration
```
REACT_APP_API_BASE_URL=https://photo-archive-api.fleatoke.workers.dev
REACT_APP_ENVIRONMENT=production
REACT_APP_APP_NAME=Photo Archive
REACT_APP_VERSION=1.0.0
```

### 🎛️ Feature Flags
```
REACT_APP_ENABLE_SHARING=true
REACT_APP_ENABLE_ALERTS=true
REACT_APP_ENABLE_ANALYTICS=true
```

### 📊 External Services (Optional)
```
REACT_APP_ENABLE_SENTRY=false
REACT_APP_ENABLE_GOOGLE_ANALYTICS=false
```

### 🔨 Build Configuration
```
NODE_ENV=production
CI=false
DISABLE_ESLINT_PLUGIN=true
GENERATE_SOURCEMAP=false
```

## 設定手順

1. Pages Dashboard → Settings → Environment Variables
2. "Add variable" をクリック
3. 上記の変数を一つずつ追加
4. Production environment を選択
5. "Save" をクリック

## 注意事項

- REACT_APP_API_BASE_URL: Workers APIのURLを正確に設定
- NODE_ENV=production: React最適化ビルド
- CI=false: Cloudflare Pages環境での警告回避
- DISABLE_ESLINT_PLUGIN: ビルド時間短縮
- GENERATE_SOURCEMAP=false: セキュリティとファイルサイズ最適化
