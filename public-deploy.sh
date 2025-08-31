#!/bin/bash

echo "🚀 Creating Expo Snack for Public Sharing"
echo "========================================"

echo "Since Node.js v23.3.0 is causing build issues, here are your best options for public sharing:"
echo ""

echo "Option 1: Expo Snack (Instant)"
echo "1. Go to https://snack.expo.dev"
echo "2. Copy your source code to the online editor"
echo "3. Get instant shareable URL"
echo ""

echo "Option 2: GitHub + Expo (Recommended)"
echo "1. Push code to GitHub"
echo "2. Create Expo Snack from GitHub URL"
echo "3. Share the snack URL"
echo ""

echo "Option 3: Downgrade Node.js and Deploy"
echo "# If you have nvm:"
echo "nvm install 20"
echo "nvm use 20"
echo "npm run build:web"
echo "netlify deploy --dir dist --prod"
echo ""

echo "Let's try creating a GitHub repository first..."
