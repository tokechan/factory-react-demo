# 写真アーカイブ最適化システム - 要件定義・技術仕様・詳細設計書

## 概要

200GB規模の写真アーカイブシステムを Cloudflare R2 + Workers/Hono + React で構築する設計書。月数百円でのコスト最適化と、9割のアーカイブ用途に特化したライフサイクル管理を実現。

## ユースケース分析

- **規模**: 200GB、月50枚追加
- **アクセスパターン**: 1日10-15回閲覧、9割はアーカイブ用途（年数回アクセス）
- **デバイス**: iPhone中心のモバイルファースト
- **コスト目標**: 月数百円（約$3.5想定）

## 機能要件 (Functional Requirements)

### 1. アップロード機能
- **Web/iPhone対応**: レスポンシブ対応のドラッグ&ドロップ + ファイル選択UI
- **メタデータ保存**: EXIF情報（撮影日時、位置情報、カメラ情報）をD1に永続化
- **プログレッシブアップロード**: プリサインドURL + マルチパート対応（5MiB〜5GiB/part）
- **ファイル形式**: JPEG, PNG, HEIC対応
- **バッチアップロード**: 複数ファイル同時選択・一括処理

### 2. 自動画像処理
- **サムネイル生成**: 200x200px、WebP形式、軽量化優先
- **中サイズ生成**: 800x600px、元アスペクト比維持、モバイル表示用
- **原本保護**: 30日経過後、自動的にIA（Infrequent Access）へライフサイクル移行
- **処理キュー**: Workers での非同期処理、進捗表示

### 3. 閲覧・検索機能
- **一覧表示**: サムネイル優先読み込み、無限スクロール（50件/ページ）
- **検索機能**: 
  - 撮影日範囲検索
  - ファイル名部分一致
  - メタデータフィルタリング（カメラ機種、位置情報）
- **詳細表示**: 中サイズ即表示 + 必要時のみ原本取得（UXガード付き）
- **ソート機能**: 撮影日時、ファイルサイズ、アップロード日時

### 4. 共有機能
- **短寿命URL**: プリサインドURL（1時間有効、APIドメイン限定）
- **アクセス制御**: 認証必須、最小権限の原則
- **共有履歴**: 共有したファイル・アクセス回数の記録

### 5. 管理機能
- **使用量ダッシュボード**: 
  - ストレージ使用量グラフ（Standard/IA別）
  - 月次コスト試算
  - アップロード統計
  - ファイル形式別内訳
- **容量アラート**: 無料枠（10GB）の80%/95%で通知
- **ライフサイクル監視**: IA移行状況、取得回数・コストトラッキング
- **データエクスポート**: メタデータCSV出力、一括ダウンロード

## 非機能要件 (Non-Functional Requirements)

### 1. コスト効率
- **目標予算**: 月数百円（200GB想定で月額約$3.5）
- **料金体系**: 
  - **Standard**: $0.015/GB-month
  - **IA**: $0.01/GB-month（30日最低保存）
  - **Egress**: 無料
  - **無料枠**: 10GB
  - **IA取得課金**: $0.01/GB（無料枠非適用）
- **コスト試算例**（200GB想定）:
  - Standard 20GB: $0.30/月
  - IA 180GB: $1.80/月  
  - 合計: 約$2.10/月 + 操作料金

### 2. パフォーマンス
- **モバイル即表示**: サムネイル優先読み込み（<2秒）
- **キャッシュ戦略**: 
  - CDN活用、ブラウザキャッシュ24時間
  - KVストアでメタデータキャッシュ
  - プリサインドURLの適切な有効期限設定
- **原本取得**: UXガード（確認ダイアログ + ローディング表示）
- **ページング**: 無限スクロール、仮想化対応

### 3. 可用性・信頼性
- **プラットフォーム制限遵守**: Workers CPU時間、メモリ使用量の管理
- **エラーハンドリング**: 
  - ネットワークタイムアウト対応
  - リトライ機構（指数バックオフ）
  - グレースフルデグラデーション
- **データ整合性**: アップロード失敗時のクリーンアップ
- **バックアップ戦略**: メタデータの定期バックアップ

### 4. セキュリティ
- **認証**: JWT ベース認証
- **アクセス制御**: 最小権限の原則
- **データ暗号化**: R2での保存時暗号化
- **監査ログ**: アクセス履歴、操作履歴の記録

## 技術仕様

### 1. Cloudflare R2 制約・料金詳細

#### ストレージ制約
- **無料枠**: 10GB/月（Standard + IA合計）
- **最大オブジェクトサイズ**: 5TiB
- **単発アップロード上限**: 5GiB
- **マルチパート要件**: 
  - パートサイズ: 5MiB〜5GiB
  - 最大パート数: 10,000
  - 最小マルチパートサイズ: 100MB推奨

#### 操作制約
- **同時書き込み制限**: 同一オブジェクトキーに1回/秒
- **バケット管理**: 50操作/秒/バケット
- **プリサインドURL**: **APIドメインのみ有効**（カスタムドメイン不可）

#### 料金体系
```
Standard Storage: $0.015/GB-month
IA Storage: $0.01/GB-month (30日最低保存)
Class A Operations: $4.50/million (Standard), $9.00/million (IA)  
Class B Operations: $0.36/million (Standard), $0.90/million (IA)
Data Retrieval (IA): $0.01/GB
Egress: 無料
```

### 2. Cloudflare Workers 制約

#### リクエスト制限
- **ボディサイズ制限**: 
  - Free/Pro: 100MB
  - Business: 200MB  
  - Enterprise: 500MB
- **CPU時間**: 継続実行時間の管理が必要
- **メモリ**: 128MB限界
- **同時リクエスト**: 1,000/分

#### エラーパターン
- **413 Payload Too Large**: ボディサイズ超過時
- **524 Timeout**: CPU時間超過時
- **429 Too Many Requests**: レート制限時

### 3. アーキテクチャ構成

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

#### 技術スタック
- **フロントエンド**: React 18 + TypeScript + Vite
- **バックエンド**: Cloudflare Workers + Hono Framework
- **ストレージ**: Cloudflare R2（S3互換）
- **データベース**: Cloudflare D1（SQLite）
- **キャッシュ**: Cloudflare KV
- **認証**: JWT + Cloudflare Access（オプション）

## 詳細設計

### 1. R2 バケット構成

```
photo-archive-bucket/
├── original/           # 30日後IA移行、原本画像（5MB-5GB）
│   ├── 2024/01/        # 年月でディレクトリ分割
│   └── 2024/02/
├── thumb/              # Standard、サムネイル（200x200, ~10KB）
│   ├── 2024/01/
│   └── 2024/02/
└── medium/             # Standard、中サイズ（800x600, ~100KB）
    ├── 2024/01/
    └── 2024/02/
```

**命名規則**: `{prefix}/{YYYY}/{MM}/{uuid}.{ext}`

### 2. API設計（Hono Router）

```typescript
// 認証
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

// アップロード
POST   /api/upload/presign          # プリサインドURL生成
POST   /api/upload/complete         # アップロード完了通知
GET    /api/upload/status/:id       # アップロード進捗

// 画像処理
POST   /api/process/variants        # サムネイル・中サイズ生成
GET    /api/process/status/:id      # 処理進捗

// 写真管理
GET    /api/photos                  # 一覧取得（ページング・検索）
GET    /api/photos/:id              # 詳細取得
GET    /api/photos/:id/original-url # 原本URL取得（短寿命）
DELETE /api/photos/:id              # 削除
PUT    /api/photos/:id/metadata     # メタデータ更新

// 統計・管理
GET    /api/stats/usage             # 使用量統計
GET    /api/stats/cost              # コスト試算
GET    /api/alerts                  # アラート一覧
POST   /api/alerts/settings         # アラート設定
```

#### APIレスポンス例

```typescript
// GET /api/photos
{
  "photos": [
    {
      "id": "uuid",
      "filename": "IMG_001.jpg",
      "upload_date": "2024-01-15T10:30:00Z",
      "file_size": 2048576,
      "storage_class": "Standard",
      "thumb_url": "https://api.example.com/thumb/...",
      "medium_url": "https://api.example.com/medium/...",
      "exif": {
        "date_taken": "2024-01-15T10:25:00Z",
        "camera": "iPhone 15 Pro",
        "gps": { "lat": 35.6762, "lng": 139.6503 }
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "total_pages": 10,
    "total_count": 487
  }
}
```

### 3. D1 データベース設計

```sql
-- 写真メタデータテーブル
CREATE TABLE photos (
    id TEXT PRIMARY KEY,                    -- UUID
    filename TEXT NOT NULL,                 -- 元ファイル名
    original_key TEXT NOT NULL,             -- R2オリジナルキー
    thumb_key TEXT,                         -- サムネイルキー
    medium_key TEXT,                        -- 中サイズキー
    file_size INTEGER NOT NULL,             -- バイト数
    content_type TEXT NOT NULL,             -- MIME type
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    storage_class TEXT DEFAULT 'Standard',  -- Standard/IA
    ia_transition_date DATETIME,            -- IA移行日時
    
    -- EXIF データ（JSON）
    exif_data JSON,
    date_taken DATETIME,                    -- 撮影日時（検索用）
    camera_model TEXT,                      -- カメラ機種
    gps_lat REAL,                           -- 緯度
    gps_lng REAL,                           -- 経度
    
    -- 統計用
    view_count INTEGER DEFAULT 0,           -- 閲覧回数
    last_accessed DATETIME,                 -- 最終アクセス日時
    original_access_count INTEGER DEFAULT 0 -- 原本アクセス回数
);

-- インデックス
CREATE INDEX idx_photos_upload_date ON photos(upload_date);
CREATE INDEX idx_photos_date_taken ON photos(date_taken);
CREATE INDEX idx_photos_storage_class ON photos(storage_class);
CREATE INDEX idx_photos_camera_model ON photos(camera_model);

-- 使用量統計テーブル
CREATE TABLE usage_stats (
    date DATE PRIMARY KEY,
    total_storage_gb REAL NOT NULL,
    standard_storage_gb REAL NOT NULL,
    ia_storage_gb REAL NOT NULL,
    monthly_cost_usd REAL,
    class_a_operations INTEGER DEFAULT 0,
    class_b_operations INTEGER DEFAULT 0,
    ia_retrievals INTEGER DEFAULT 0,
    ia_retrieval_gb REAL DEFAULT 0
);

-- アラート設定テーブル  
CREATE TABLE alert_settings (
    id INTEGER PRIMARY KEY,
    alert_type TEXT NOT NULL,               -- storage_quota/cost_threshold
    threshold_value REAL NOT NULL,
    is_enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- アクセスログテーブル
CREATE TABLE access_logs (
    id INTEGER PRIMARY KEY,
    photo_id TEXT NOT NULL,
    access_type TEXT NOT NULL,              -- thumb/medium/original
    accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    cost_incurred_usd REAL DEFAULT 0,       -- IA取得時のコスト
    FOREIGN KEY (photo_id) REFERENCES photos(id)
);
```

### 4. ライフサイクル設定

```json
{
  "rules": [
    {
      "id": "original-to-ia-30days",
      "status": "Enabled",
      "filter": {
        "prefix": "original/"
      },
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

### 5. KV ストア設計

```typescript
// キャッシュキー設計
interface KVKeys {
  // メタデータキャッシュ（1時間）
  `photo_meta:${photo_id}`: PhotoMetadata;
  
  // 一覧キャッシュ（30分）  
  `photo_list:page_${page}:sort_${sort}`: PhotoListResponse;
  
  // 統計キャッシュ（6時間）
  `usage_stats:${date}`: UsageStats;
  
  // プリサインドURLキャッシュ（50分）
  `presigned_url:${photo_id}:${type}`: string;
  
  // セッションデータ（24時間）
  `session:${session_id}`: SessionData;
}
```

## エッジケース対策（高・中優先度）

### 高優先度対策

#### 1. 容量超過対策
**問題**: 無料枠10GB超過による予期しない課金

**対策**:
- **事前監視**: 使用量80%/95%でアラート通知
- **アップロード前チェック**: 残容量vs新ファイルサイズ検証
- **自動削除提案**: 古いファイル（1年以上未アクセス）の削除候補表示
- **緊急停止**: 99%到達時のアップロード一時停止機能

```typescript
// 実装例
async function checkStorageQuota(fileSize: number): Promise<{canUpload: boolean, message?: string}> {
  const currentUsage = await getCurrentStorageUsage();
  const freeSpaceGB = 10 - currentUsage.totalGB;
  const fileSizeGB = fileSize / (1024**3);
  
  if (fileSizeGB > freeSpaceGB) {
    return {
      canUpload: false,
      message: `容量不足: 残り${freeSpaceGB.toFixed(2)}GB、ファイルサイズ${fileSizeGB.toFixed(2)}GB`
    };
  }
  
  return { canUpload: true };
}
```

#### 2. 413エラー対策（Workers ボディサイズ制限）
**問題**: 大ファイルで413 Payload Too Large発生

**対策**:
- **事前サイズチェック**: クライアント側で制限値未満を確認
- **マルチパート自動切り替え**: 100MB超過時の自動分割アップロード
- **プログレッシブアップロード**: チャンクベースの段階的処理
- **フォールバック**: 直接R2プリサインドURL利用（Workers迂回）

```typescript
// 実装例
function shouldUseMultipart(fileSize: number, plan: 'free' | 'pro' | 'business'): boolean {
  const limits = { free: 100, pro: 100, business: 200 }; // MB
  return fileSize > limits[plan] * 1024 * 1024;
}

async function initiateMultipartUpload(bucket: R2Bucket, key: string): Promise<R2MultipartUpload> {
  return await bucket.createMultipartUpload(key);
}
```

#### 3. IA取り出し課金対策
**問題**: 頻繁な原本アクセスでIA取得課金急増

**対策**:
- **明示的確認UI**: 「この操作で$0.xx発生します」警告表示
- **月次制限**: 予算ベースの取得回数上限設定
- **アクセス履歴表示**: 「今月既に○回アクセス済み」情報提供
- **コスト予測**: リアルタイムでの月次コスト試算更新

```typescript
// 実装例  
async function getOriginalUrlWithCostWarning(photoId: string): Promise<{url?: string, warning?: string}> {
  const photo = await getPhoto(photoId);
  if (photo.storage_class === 'IA') {
    const costUSD = (photo.file_size / (1024**3)) * 0.01; // $0.01/GB
    const monthlyAccess = await getMonthlyAccessCount(photoId);
    
    return {
      warning: `IA取得料金 $${costUSD.toFixed(4)} が発生します。今月${monthlyAccess}回アクセス済み。続行しますか？`
    };
  }
  
  const url = await generatePresignedUrl(photo.original_key);
  return { url };
}
```

### 中優先度対策

#### 4. Class B操作急増対策（リスト操作料金）
**問題**: 一覧表示でのClass B操作料金増加

**対策**:
- **強制ページネーション**: 最大50件/リクエスト制限
- **KVキャッシュ活用**: 一覧データの30分キャッシュ
- **プリフェッチ戦略**: 次ページデータの先読み
- **バッチ処理最適化**: 複数操作の統合実行

```typescript
// 実装例
async function listPhotosWithCache(page: number, cacheKey: string): Promise<PhotoListResponse> {
  // KVキャッシュから取得試行
  const cached = await KV.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // R2から取得（最大50件）
  const result = await bucket.list({ 
    limit: 50, 
    startAfter: getPageOffset(page) 
  });
  
  // 30分キャッシュ
  await KV.put(cacheKey, JSON.stringify(result), { expirationTtl: 1800 });
  return result;
}
```

#### 5. 通信不安定対策
**問題**: モバイル環境での接続不安定・アップロード中断

**対策**:
- **アップロード再開機能**: 中断点からの継続アップロード
- **指数バックオフリトライ**: 1秒→2秒→4秒の段階的再試行
- **オフライン対応**: Service Worker でのアップロードキューイング
- **プログレス保存**: ローカルストレージでの進捗状況永続化

```typescript
// 実装例
async function uploadWithRetry(file: File, maxRetries = 3): Promise<UploadResult> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await uploadFile(file);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000; // 指数バックオフ
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

#### 6. 認証・権限エラー対策
**問題**: JWT有効期限切れ・プリサインドURL期限切れ

**対策**:
- **自動リフレッシュ**: JWT有効期限前の自動更新
- **プリサインドURL管理**: 有効期限（1時間）のローカル管理
- **権限検証**: API呼び出し前の事前確認
- **グレースフルフォールバック**: 認証エラー時の再ログイン誘導

```typescript
// 実装例
class AuthManager {
  async getValidToken(): Promise<string> {
    const token = localStorage.getItem('jwt_token');
    const expiry = localStorage.getItem('jwt_expiry');
    
    if (!token || Date.now() > parseInt(expiry)) {
      return await this.refreshToken();
    }
    
    return token;
  }
  
  async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    
    const { access_token, expires_in } = await response.json();
    localStorage.setItem('jwt_token', access_token);
    localStorage.setItem('jwt_expiry', (Date.now() + expires_in * 1000).toString());
    
    return access_token;
  }
}
```

## 管理機能詳細

### コストダッシュボード

```typescript
interface CostDashboard {
  // リアルタイム使用量
  storage: {
    standard_gb: number;
    ia_gb: number;
    total_gb: number;
    free_quota_remaining: number; // 無料枠残量
  };
  
  // 月次コスト
  monthly_cost: {
    storage_standard: number;   // $0.015/GB
    storage_ia: number;         // $0.01/GB  
    operations_class_a: number; // $4.50/million
    operations_class_b: number; // $0.36/million
    ia_retrievals: number;      // $0.01/GB
    total_usd: number;
  };
  
  // 予測・アラート
  projection: {
    month_end_total_usd: number;
    quota_exhaustion_date?: string; // 無料枠終了予測日
    cost_alerts: Alert[];
  };
}

interface Alert {
  type: 'quota_80' | 'quota_95' | 'cost_threshold';
  message: string;
  severity: 'warning' | 'critical';
  triggered_at: string;
}
```

### UXガード実装

#### 原本取得時の確認UI
```typescript
const OriginalImageModal: React.FC<{photo: Photo}> = ({ photo }) => {
  const [showCostWarning, setShowCostWarning] = useState(false);
  
  const handleOriginalAccess = async () => {
    if (photo.storage_class === 'IA') {
      const cost = calculateIACost(photo.file_size);
      const confirmMessage = `
        原本画像の取得に $${cost.toFixed(4)} の料金が発生します。
        ファイルサイズ: ${formatFileSize(photo.file_size)}
        今月のIA取得回数: ${photo.monthly_ia_access}回
        続行しますか？
      `;
      
      if (!window.confirm(confirmMessage)) return;
    }
    
    const url = await getOriginalUrl(photo.id);
    window.open(url, '_blank');
  };
  
  return (
    <div className="original-access-section">
      <button onClick={handleOriginalAccess} className="btn-warning">
        {photo.storage_class === 'IA' ? '原本取得（料金発生）' : '原本表示'}
      </button>
    </div>
  );
};
```

## 運用・監視

### 1. アラート設定
- **容量アラート**: 80%（8GB）、95%（9.5GB）
- **コストアラート**: 月$5、$10超過時
- **エラー率アラート**: 5%以上のAPI失敗率
- **IA取得アラート**: 月$1以上のIA取得コスト

### 2. ログ・メトリクス
```typescript
interface Metrics {
  // パフォーマンス
  upload_duration_ms: number;
  thumbnail_generation_ms: number;
  api_response_time_ms: number;
  
  // ビジネス
  daily_uploads: number;
  storage_growth_gb_per_day: number;
  user_engagement_score: number;
  
  // コスト
  daily_cost_usd: number;
  ia_retrieval_count: number;
  operations_count: { class_a: number; class_b: number };
}
```

### 3. バックアップ戦略
- **メタデータ**: 日次D1データベースエクスポート
- **設定**: アラート設定・ライフサイクルルールの定期バックアップ
- **ログ**: 重要操作ログの長期保存（KV → 外部ストレージ）

## 今後の拡張可能性

### 1. 機能拡張
- **顔認識**: Cloudflare Images の AI 機能活用
- **重複検出**: ハッシュベースの重複画像検出
- **アルバム機能**: タグベースの画像グルーピング
- **位置情報マップ**: 撮影場所の地図表示

### 2. 技術的改善
- **CDN最適化**: Cloudflare Images の活用検討
- **エッジコンピューティング**: より多くの処理をエッジで実行
- **AI画像解析**: 自動タグ付け・検索機能強化

### 3. 運用改善
- **自動スケーリング**: 使用量に応じたプラン変更提案
- **コスト最適化**: より詳細な使用パターン分析
- **パフォーマンス監視**: リアルタイムでの応答時間監視

---

## まとめ

本設計書では、200GB規模の写真アーカイブシステムを月数百円で運用する包括的なソリューションを提示しました。Cloudflare R2のIA機能を活用したライフサイクル管理により、9割のアーカイブ用途に最適化されたコスト効率を実現し、高・中優先度のエッジケースに対する具体的な対策を盛り込んでいます。

**設計のポイント**:
- 30日後の自動IA移行によるコスト削減（33%削減）
- モバイルファーストのUX（サムネイル優先表示）
- 予期しない課金を防ぐ包括的なガード機能
- Cloudflare プラットフォームの制約を考慮した現実的な設計

この設計に基づき、段階的な実装とコスト監視を行うことで、安全かつ効率的な写真アーカイブシステムの構築が可能です。
