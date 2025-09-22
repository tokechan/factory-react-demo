# Photo Archive API

Cloudflare Workers + Hono を使用した写真アーカイブシステムのAPIです。

## 機能

- **認証**: JWT ベースの認証システム
- **アップロード**: プリサインドURL + マルチパート対応
- **画像処理**: サムネイル・中サイズ自動生成
- **ライフサイクル**: 30日後の自動IA移行
- **コスト管理**: 使用量監視・アラート機能
- **検索**: 日付・メタデータベースの検索

## 技術スタック

- **Runtime**: Cloudflare Workers
- **Framework**: Hono
- **Database**: Cloudflare D1 (SQLite)
- **Storage**: Cloudflare R2
- **Cache**: Cloudflare KV
- **Language**: TypeScript

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Cloudflare リソースの作成

```bash
# D1 データベース作成
npx wrangler d1 create photo-archive-db

# R2 バケット作成
npx wrangler r2 bucket create photo-archive-bucket

# KV Namespace 作成
npx wrangler kv:namespace create "CACHE"
```

### 3. wrangler.toml の設定

作成されたリソースのIDを `wrangler.toml` に設定してください。

### 4. データベースマイグレーション

```bash
# 開発環境
npx wrangler d1 migrations apply photo-archive-db --local

# 本番環境
npx wrangler d1 migrations apply photo-archive-db
```

### 5. 環境変数の設定

```bash
# JWT秘密鍵の設定
npx wrangler secret put JWT_SECRET

# CORS オリジンの設定
npx wrangler secret put CORS_ORIGINS
```

## 開発

### ローカル開発サーバー

```bash
npm run dev
```

### デプロイ

```bash
# ステージング環境
npm run deploy:staging

# 本番環境
npm run deploy:production
```

### データベース管理

```bash
# マイグレーション適用
npm run db:migrate

# ローカルD1コンソール
npx wrangler d1 execute photo-archive-db --local --command="SELECT * FROM photos LIMIT 10"
```

## API エンドポイント

### 認証

- `POST /api/auth/register` - ユーザー登録
- `POST /api/auth/login` - ログイン
- `POST /api/auth/refresh` - トークン更新
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/me` - ユーザー情報取得

### アップロード

- `POST /api/upload/presign` - プリサインドURL生成
- `POST /api/upload/complete` - アップロード完了
- `GET /api/upload/status/:id` - アップロード状況確認
- `POST /api/upload/multipart/:id/init` - マルチパートアップロード初期化
- `GET /api/upload/multipart/:id/part/:partNumber` - パート用URL取得
- `POST /api/upload/multipart/:id/complete` - マルチパート完了

### 写真管理

- `GET /api/photos` - 写真一覧取得
- `GET /api/photos/:id` - 写真詳細取得
- `GET /api/photos/:id/original-url` - 原本URL取得
- `PUT /api/photos/:id/metadata` - メタデータ更新
- `DELETE /api/photos/:id` - 写真削除

### 統計・管理

- `GET /api/stats/usage` - 使用量統計
- `GET /api/stats/cost` - コスト分析
- `GET /api/stats/history` - 履歴データ
- `GET /api/alerts` - アラート一覧
- `POST /api/alerts/settings` - アラート設定

### ユーティリティ

- `GET /` - API ステータス
- `GET /health` - ヘルスチェック
- `GET /api/config` - クライアント設定

## 設定

### R2 ライフサイクルルール

```json
{
  "rules": [
    {
      "id": "original-to-ia-30days",
      "status": "Enabled",
      "filter": { "prefix": "original/" },
      "transitions": [
        {
          "days": 30,
          "storage_class": "InfrequentAccess"
        }
      ]
    }
  ]
}
```

### 環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| `ENVIRONMENT` | 実行環境 | `development`, `staging`, `production` |
| `JWT_SECRET` | JWT署名用秘密鍵 | ランダムな文字列 |
| `CORS_ORIGINS` | CORS許可オリジン | `http://localhost:3000,https://yourdomain.com` |

## アーキテクチャ

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │───▶│ Cloudflare      │───▶│   R2 Storage    │
│   (Frontend)    │    │ Workers + Hono  │    │   (3 Buckets)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   D1 Database   │    │   KV Store      │
                       │   (Metadata)    │    │   (Cache)       │
                       └─────────────────┘    └─────────────────┘
```

## セキュリティ考慮事項

- JWT有効期限の適切な設定
- プリサインドURLの短寿命化（1時間）
- CORS設定の制限
- レート制限の実装
- 入力値検証（Zod）
- SQLインジェクション対策

## パフォーマンス最適化

- KVキャッシュの活用
- クエリインデックスの最適化
- マルチパートアップロードの自動切り替え
- バッチ処理による効率化

## 監視・ログ

- Cloudflare Analytics
- Workers ログ
- エラートラッキング
- コスト監視アラート

## 制限事項

- Workers CPU時間: 30秒（設定変更可能）
- R2 単発アップロード: 5GB
- D1 データベースサイズ: 500MB（有料プランで拡張可能）
- KV 書き込み: 1,000回/分

## ライセンス

MIT License
