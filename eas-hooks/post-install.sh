#!/bin/bash
# Skip installing dev dependencies for production builds
echo "Removing dev dependencies to avoid build issues..."
npm prune --production
