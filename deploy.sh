#!/bin/bash

echo "🚀 DailyTracker Deployment Script"
echo "================================="

echo "Current issues detected:"
echo "- expo publish is deprecated"
echo "- Node.js v23.3.0 has compatibility issues"
echo "- npm module loading warnings"
echo ""

echo "✅ Recommended Solutions:"
echo ""

echo "1. Quick Sharing (Expo Go):"
echo "   npx expo start"
echo "   → Share QR code with users who have Expo Go app"
echo ""

echo "2. Web Deployment:"
echo "   # First, downgrade Node.js to v20 or v22"
echo "   nvm use 20  # if you have nvm"
echo "   npx expo export --platform web"
echo "   npx serve dist"
echo ""

echo "3. Modern EAS Build:"
echo "   npm install -g @expo/eas-cli"
echo "   eas login"
echo "   eas build:configure"
echo "   eas build --platform all"
echo ""

echo "4. Vercel Deployment:"
echo "   npm install -g vercel"
echo "   npx expo export --platform web"
echo "   vercel dist"
echo ""

echo "💡 For immediate sharing, run: npx expo start"
echo "   Then scan QR code with Expo Go app on mobile device"
