#!/bin/bash

# Fix paths in index.html for GitHub Pages subdirectory deployment
# Changes /_expo/ to /DailyTracker/_expo/

DIST_DIR="$1"
BASE_PATH="/DailyTracker"

if [ ! -d "$DIST_DIR" ]; then
    echo "Error: Directory $DIST_DIR does not exist"
    exit 1
fi

echo "Fixing paths in $DIST_DIR for GitHub Pages..."

# Fix index.html
if [ -f "$DIST_DIR/index.html" ]; then
    # Use sed to replace paths
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s|=\"/|=\"${BASE_PATH}/|g" "$DIST_DIR/index.html"
        sed -i '' "s|href=\"${BASE_PATH}//|href=\"/|g" "$DIST_DIR/index.html"
    else
        # Linux
        sed -i "s|=\"/|=\"${BASE_PATH}/|g" "$DIST_DIR/index.html"
        sed -i "s|href=\"${BASE_PATH}//|href=\"/|g" "$DIST_DIR/index.html"
    fi
    echo "✓ Fixed paths in index.html"
fi

# Fix metadata.json if it exists
if [ -f "$DIST_DIR/metadata.json" ]; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|\"bundler\":\"/_expo|\"bundler\":\"${BASE_PATH}/_expo|g" "$DIST_DIR/metadata.json"
    else
        sed -i "s|\"bundler\":\"/_expo|\"bundler\":\"${BASE_PATH}/_expo|g" "$DIST_DIR/metadata.json"
    fi
    echo "✓ Fixed paths in metadata.json"
fi

echo "✓ Path fixes complete!"
