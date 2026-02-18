#!/bin/bash

echo "🚀 Deploying DailyTracker to GitHub Pages"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git repo is clean
if [[ -n $(git status -s) ]]; then
    echo -e "${YELLOW}⚠️  Warning: You have uncommitted changes${NC}"
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Deployment cancelled${NC}"
        exit 1
    fi
fi

# Step 1: Build web version
echo -e "\n${GREEN}Step 1: Building web version...${NC}"
npx expo export --platform web

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

# Step 2: Copy additional files to dist
echo -e "\n${GREEN}Step 2: Copying additional files...${NC}"
if [ -f "public/manifest.json" ]; then
    cp public/manifest.json dist/
fi
if [ -f "public/service-worker.js" ]; then
    cp public/service-worker.js dist/
fi
if [ -f "public/offline.html" ]; then
    cp public/offline.html dist/
fi

# Step 3: Deploy to GitHub Pages
echo -e "\n${GREEN}Step 3: Deploying to GitHub Pages...${NC}"
npx gh-pages -d dist -m "Deploy $(date '+%Y-%m-%d %H:%M:%S')"

if [ $? -eq 0 ]; then
    echo -e "\n${GREEN}✅ Deployment successful!${NC}"
    echo -e "Your app will be available at: ${GREEN}https://sarathk82.github.io/DailyTracker${NC}"
    echo -e "\n${YELLOW}Note: It may take a few minutes for changes to appear${NC}"
else
    echo -e "\n${RED}❌ Deployment failed!${NC}"
    exit 1
fi
