#!/bin/bash

echo "🚀 Building Daily Tracker for GitHub Pages..."

# Build the app
npm run build:web

echo "📦 Build complete! Files are in the 'dist' folder."
echo ""
echo "📋 Next Steps:"
echo "1. Go to https://github.com"
echo "2. Create a new public repository (e.g., 'dailytracker-web')"
echo "3. Upload all files from the 'dist' folder to the repository"
echo "4. Go to repository Settings → Pages"
echo "5. Set Source to 'Deploy from a branch'"
echo "6. Select 'main' branch and '/ (root)' folder"
echo "7. Save and wait a few minutes"
echo ""
echo "🌐 Your app will be available at:"
echo "https://yourusername.github.io/repositoryname"
echo ""
echo "📂 Files to upload:"
ls -la dist/

echo ""
echo "✅ Ready for deployment!"

echo "Option 3: Downgrade Node.js and Deploy"
echo "# If you have nvm:"
echo "nvm install 20"
echo "nvm use 20"
echo "npm run build:web"
echo "netlify deploy --dir dist --prod"
echo ""

echo "Let's try creating a GitHub repository first..."
