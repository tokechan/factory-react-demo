# Cloudflare Pages ビルド設定

## 🔗 Git 連携設定

### Repository Configuration
```
Repository: tokechan/factory-react-demo
Owner: tokechan
Production branch: main
Preview deployments: All branches
```

### Build Settings
```
Framework preset: Create React App
Build command: npm run build:production
Build output directory: build
Root directory: (empty)
Install command: npm ci
Node.js version: 18
```

## ⚙️ Environment Variables (Production)

### Core Application Settings
```
REACT_APP_API_BASE_URL=https://photo-archive-api.fleatoke.workers.dev
REACT_APP_ENVIRONMENT=production
REACT_APP_APP_NAME=Photo Archive
REACT_APP_VERSION=1.0.0
```

### Feature Flags
```
REACT_APP_ENABLE_SHARING=true
REACT_APP_ENABLE_ALERTS=true
REACT_APP_ENABLE_ANALYTICS=true
```

### Build Optimization
```
NODE_ENV=production
CI=false
DISABLE_ESLINT_PLUGIN=true
GENERATE_SOURCEMAP=false
```

### Optional Services
```
REACT_APP_ENABLE_SENTRY=false
REACT_APP_ENABLE_GOOGLE_ANALYTICS=false
```

## 🔧 Advanced Settings

### Functions
```
Compatibility date: 2024-09-22
Compatibility flags: (none required)
```

### Redirects & Headers
- `_redirects` file: ✅ Repository root
- `functions/_headers` file: ✅ Repository root

### Security
```
Access policy: Public (for main domain)
Preview access: Public (for testing)
```

## 🚀 Deployment Triggers

### Automatic Deployments
- ✅ Push to main branch → Production deployment
- ✅ Push to other branches → Preview deployment
- ✅ Pull requests → Preview deployment

### Manual Deployments
- ✅ Wrangler CLI: `wrangler pages deploy build --project-name photo-archive`
- ✅ Dashboard: Upload folder option

## 📊 Expected Build Output

### Build Success Metrics
```
Build time: ~2-4 minutes
Bundle size: ~244 kB (gzipped)
Files generated: ~14 static files
Node.js version: 18.x
```

### Build Commands Sequence
```bash
1. npm ci                    # Install dependencies
2. npm run build:production  # Build React app
3. Deploy to Pages           # Upload build/ directory
```

## 🔍 Troubleshooting

### Common Build Issues
1. **Environment variables not loading**
   - Verify REACT_APP_ prefix for client-side variables
   - Check Production vs Preview environment settings

2. **Build command fails**
   - Ensure `npm run build:production` exists in package.json
   - Verify Node.js version compatibility

3. **API connection issues**
   - Check REACT_APP_API_BASE_URL is correct
   - Verify Workers API is responding

### Debug Commands
```bash
# Test build locally
npm run build:production

# Test production env variables
cat .env.production

# Manual deploy for testing
wrangler pages deploy build --project-name photo-archive
```

## 📈 Monitoring & Analytics

### Deployment Monitoring
- ✅ Build logs in Pages dashboard
- ✅ Real-time deployment status
- ✅ Performance metrics and Web Vitals

### Success Indicators
- ✅ Build completes without errors
- ✅ Site loads at https://photo-archive.pages.dev
- ✅ All React routes work correctly
- ✅ API connections established
