# 📋 Cloudflare Deployment Setup Guide

## 🚀 デプロイ手順書

### Phase 1: Cloudflare リソース作成

#### 1. R2 Storage バケット作成

```bash
# R2バケット作成（Cloudflare Dashboard または CLI）
wrangler r2 bucket create photo-archive-bucket-prod
wrangler r2 bucket create photo-archive-bucket-dev
```

**Dashboard作成手順:**
1. Cloudflare Dashboard → R2 Object Storage
2. "Create bucket" をクリック
3. バケット名: `photo-archive-bucket-prod`
4. 地域: Auto (推奨)

#### 2. D1 Database 作成

```bash
# D1データベース作成
wrangler d1 create photo-archive-db-prod
wrangler d1 create photo-archive-db-dev
```

作成後、出力されるdatabase_idをメモ！

#### 3. KV Namespace 作成

```bash
# KVネームスペース作成（キャッシュ用）
wrangler kv:namespace create "CACHE"
wrangler kv:namespace create "CACHE" --preview
```

作成後、出力されるnamespace_idをメモ！

### Phase 2: 設定ファイル更新

#### 4. wrangler.toml 更新

```toml
name = "photo-archive-api"
compatibility_date = "2024-09-22"
main = "src/index.ts"

workers_dev = true
node_compat = true

# Environment Variables
[env.production]
name = "photo-archive-api-prod"

[env.staging]  
name = "photo-archive-api-staging"

# R2 Bucket Bindings
[[r2_buckets]]
binding = "PHOTO_BUCKET"
bucket_name = "photo-archive-bucket-prod"
preview_bucket_name = "photo-archive-bucket-dev"

# D1 Database Binding  
[[d1_databases]]
binding = "DB"
database_name = "photo-archive-db-prod"
database_id = "PUT_YOUR_ACTUAL_DATABASE_ID_HERE"
preview_database_id = "PUT_YOUR_PREVIEW_DATABASE_ID_HERE"

# KV Namespace Bindings
[[kv_namespaces]]
binding = "CACHE"
id = "PUT_YOUR_ACTUAL_KV_ID_HERE"
preview_id = "PUT_YOUR_PREVIEW_KV_ID_HERE"

# Variables
[vars]
ENVIRONMENT = "production"
JWT_SECRET = "PUT_SECURE_JWT_SECRET_HERE"
CORS_ORIGINS = "https://photos.YOUR-DOMAIN.com"

# Limits
[limits]
cpu_ms = 30000
```

#### 5. React 環境変数作成

`.env.production` ファイル作成:
```env
REACT_APP_API_BASE_URL=https://api.YOUR-DOMAIN.com
REACT_APP_ENVIRONMENT=production
REACT_APP_APP_NAME=Photo Archive
```

### Phase 3: ドメイン設計

#### 推奨ドメイン構成:

```
your-existing-domain.com (Blog)
├── photos.your-domain.com     (React App)
├── api.your-domain.com        (Workers API)
└── cdn.your-domain.com        (R2 Images - オプション)
```

#### DNS設定（あとで設定）:
- `photos` A/AAAA records → Cloudflare Pages IP
- `api` A/AAAA records → Cloudflare Workers IP

### Phase 4: デプロイコマンド

#### API デプロイ:
```bash
cd api
npm install
wrangler deploy --env production
```

#### フロントエンド デプロイ:
```bash
# GitHub に push後、Cloudflare Pages で自動デプロイ
npm run build  # ローカルテスト用
```

### Phase 5: 最終設定

#### CORS設定:
API側で本番ドメインを許可:
```typescript
CORS_ORIGINS = "https://photos.your-domain.com"
```

#### R2 Public Access:
- 画像表示用のパブリックアクセス設定
- Custom domain設定（オプション）

---

## 🔧 必要なID・シークレット

### 生成・取得が必要:
- [ ] D1 Database ID (prod)
- [ ] D1 Database ID (preview)  
- [ ] KV Namespace ID
- [ ] KV Namespace ID (preview)
- [ ] JWT Secret (ランダム生成)
- [ ] 独自ドメイン名決定

### 既存情報:
- [x] Cloudflare Account ID
- [x] Zone ID (ドメイン用)
- [x] API Token

---

## ⚠️ セキュリティチェックリスト

- [ ] JWT_SECRET は強力なランダム文字列
- [ ] 本番環境でのデバッグログ無効化
- [ ] CORS設定を本番ドメインのみに制限
- [ ] R2バケットのパブリック設定確認
- [ ] API Rate Limiting設定

---

## 🧪 テスト項目

### デプロイ後確認:
- [ ] API Health Check: `https://api.your-domain.com/health`
- [ ] フロントエンド表示: `https://photos.your-domain.com`
- [ ] 画像アップロード機能
- [ ] 認証機能
- [ ] アラート機能
- [ ] レスポンシブデザイン
- [ ] HTTPS証明書

### パフォーマンステスト:
- [ ] ページ読み込み速度
- [ ] 画像表示速度  
- [ ] API応答時間
- [ ] モバイル表示

---

## 💰 コスト見積もり

### Cloudflare 無料枠:
- Workers: 100,000 リクエスト/日
- R2: 10GB ストレージ
- Pages: 無制限
- D1: 5GB
- KV: 100,000 read/日

### 有料移行目安:
- 大量画像アップロード: R2ストレージ料金
- 高トラフィック: Workers実行回数料金
- **個人利用なら基本的に無料枠内で十分！**
