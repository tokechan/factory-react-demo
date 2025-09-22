# Photo Archive System

Cloudflare R2 + Workers/Hono + React を使用した写真アーカイブシステムです。

## プロジェクト構成

- **Frontend**: React アプリケーション (src/)
- **API**: Cloudflare Workers + Hono (api/)
- **Docs**: システム設計書 (Docs/)

## 開発環境セットアップ

### フロントエンド (React)

Create React App をベースとしたフロントエンドアプリケーション。

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

### API (Cloudflare Workers)

```bash
cd api
npm install
npm run dev  # ローカル開発サーバー
```

詳細は [api/README.md](./api/README.md) を参照してください。

## システム設計

設計書は [Docs/photo-archive-system-design.md](./Docs/photo-archive-system-design.md) に詳細があります。

### 主要機能

- 📸 写真アップロード（マルチパート対応）
- 🎯 自動サムネイル・中サイズ生成
- 🗃️ 30日後の自動IA移行（コスト最適化）
- 📊 使用量・コストダッシュボード
- 🔍 日付・メタデータ検索
- ⚡ モバイルファーストUI

### 技術スタック

- **Frontend**: React 18 + TypeScript
- **API**: Cloudflare Workers + Hono
- **Storage**: Cloudflare R2 (S3互換)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
