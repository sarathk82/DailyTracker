// This file is for any web-specific Metro configuration
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Set the public path for GitHub Pages subdirectory
if (process.env.EXPO_PUBLIC_URL) {
  config.transformer = {
    ...config.transformer,
    publicPath: process.env.EXPO_PUBLIC_URL,
  };
}

module.exports = config;
