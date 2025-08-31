# DailyTracker Deployment Guide

## Current Issues
- `expo publish` is deprecated since SDK 46+
- Node.js v23.3.0 compatibility issues with Jest packages
- npm configuration warnings

## Deployment Options

### 1. Web Deployment (Easiest)
```bash
# Option A: Use Metro bundler
npx expo export --platform web
npx serve dist

# Option B: Deploy to Vercel
npm install -g vercel
npx expo export --platform web
vercel dist

# Option C: Deploy to Netlify
npm install -g netlify-cli
npx expo export --platform web
netlify deploy --dir dist --prod
```

### 2. EAS Build (Modern Expo)
```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for production
eas build --platform all
```

### 3. Expo Go (Quick Testing)
```bash
# Just run and share QR code
npx expo start
# Share the QR code with others who have Expo Go app
```

## Fixes Applied
1. Updated app.json with proper configuration
2. Added eas.json for modern builds
3. Added deployment scripts to package.json

## Next Steps
1. Choose your preferred deployment method
2. Follow the commands above
3. For production apps, use EAS Build
4. For quick sharing, use Expo Go
