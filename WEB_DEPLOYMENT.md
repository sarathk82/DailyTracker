# Web Deployment Guide

## Prerequisites

1. Complete [FIREBASE_SETUP.md](FIREBASE_SETUP.md) first
2. Firebase CLI installed: `npm install -g firebase-tools`
3. Firebase config updated in `src/config/firebase.ts`

## Option 1: Firebase Hosting (Recommended)

### Initial Setup

```bash
# Login to Firebase
firebase login

# Initialize Firebase (only first time)
firebase init

# Select:
# - Hosting
# - Firestore (if not already done)
# Use existing project: daily-tracker or smpl-journal
# Public directory: web-build
# Single page app: Yes
# Automatic builds with GitHub: No (or Yes if you prefer)
```

### Build and Deploy

```bash
# 1. Build web version
npx expo export:web

# 2. Copy PWA files to build
cp public/manifest.json web-build/
cp public/service-worker.js web-build/
cp public/offline.html web-build/

# 3. Deploy to Firebase
firebase deploy --only hosting

# Or deploy everything (hosting + firestore rules)
firebase deploy
```

### Your app will be live at:
- `https://your-project.web.app`
- `https://your-project.firebaseapp.com`

### Custom Domain (Optional)

```bash
# Add custom domain
firebase hosting:channel:deploy production

# In Firebase Console:
# Hosting > Add custom domain > Follow instructions
```

## Option 2: Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Build
npx expo export:web
cp public/manifest.json web-build/
cp public/service-worker.js web-build/
cp public/offline.html web-build/

# Deploy
cd web-build
vercel --prod
```

## Option 3: Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Build
npx expo export:web
cp public/manifest.json web-build/
cp public/service-worker.js web-build/
cp public/offline.html web-build/

# Deploy
cd web-build
netlify deploy --prod
```

## Environment Variables

For production, create `.env.production`:

```bash
FIREBASE_API_KEY=your_key
FIREBASE_AUTH_DOMAIN=your_domain
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_bucket
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

## Build Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "web:build": "npx expo export:web",
    "web:serve": "npx serve web-build",
    "web:deploy": "npm run web:build && cp public/*.{json,js,html} web-build/ && firebase deploy --only hosting",
    "web:deploy:all": "npm run web:build && cp public/*.{json,js,html} web-build/ && firebase deploy"
  }
}
```

Then deploy with:
```bash
npm run web:deploy
```

## Testing PWA Locally

```bash
# Build
npm run web:build

# Serve with HTTPS (required for PWA)
npx serve -s web-build --ssl-cert ./cert.pem --ssl-key ./key.pem

# Or use Firebase emulator
firebase serve
```

### Test PWA Features:
1. Open in Chrome: `https://localhost:5000`
2. Open DevTools > Application > Service Workers
3. Check "Offline" and reload - should show offline page
4. Application > Manifest - verify PWA settings
5. Lighthouse > Run audit - check PWA score

## PWA Installation

### Desktop (Chrome/Edge):
- Visit your deployed URL
- Click install icon in address bar
- Or: Menu > Install Smpl Journal

### Mobile (iOS Safari):
- Visit your URL
- Tap Share button
- Tap "Add to Home Screen"

### Mobile (Android Chrome):
- Visit your URL
- Tap menu
- Tap "Install app" or "Add to Home screen"

## Post-Deployment Checklist

- [ ] App loads at deployed URL
- [ ] Sign up/Sign in works
- [ ] Data syncs across devices
- [ ] PWA installable (install button appears)
- [ ] Offline mode works
- [ ] Service worker registered
- [ ] HTTPS enabled
- [ ] Custom domain configured (optional)
- [ ] Firebase rules deployed
- [ ] Test on mobile browsers
- [ ] Test on desktop browsers
- [ ] Lighthouse PWA score > 90

## Monitoring

### Firebase Console
- Hosting > Usage
- Analytics > Dashboard
- Authentication > Users
- Firestore > Data

### Performance
```bash
# Run Lighthouse audit
lighthouse https://your-app.web.app --view
```

## Troubleshooting

### Service Worker Not Registering
```javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('Registered:', registrations);
});
```

### PWA Not Installable
- Check manifest.json is accessible: `/manifest.json`
- Verify HTTPS is enabled
- Check service worker is active
- Review Chrome DevTools > Application > Manifest

### Build Errors
```bash
# Clear caches
rm -rf node_modules web-build .expo
npm install
npm run web:build
```

### Firebase Deployment Fails
```bash
# Re-login
firebase logout
firebase login

# Check project
firebase projects:list

# Use specific project
firebase use your-project-id
```

## CI/CD with GitHub Actions

Create `.github/workflows/deploy-web.yml`:

```yaml
name: Deploy Web
on:
  push:
    branches: [main, master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm install
      - run: npm run web:build
      - run: cp public/*.{json,js,html} web-build/
      
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
```

## Updates and Versioning

When you update the app:

```bash
# 1. Update version in app.json
# 2. Build
npm run web:build

# 3. Update service worker cache version
# Edit public/service-worker.js:
# const CACHE_NAME = 'smpl-journal-v2'; // Increment version

# 4. Deploy
firebase deploy --only hosting
```

Users will see update prompt on next visit.

## Cost Considerations

Firebase Free Tier:
- **Hosting**: 10 GB storage, 360 MB/day bandwidth
- **Good for**: ~1,000 daily active users

Upgrade to Blaze (pay-as-you-go) if you exceed limits.

## Support

- Firebase Docs: https://firebase.google.com/docs/hosting
- Expo Web: https://docs.expo.dev/workflow/web/
- PWA Guide: https://web.dev/progressive-web-apps/
