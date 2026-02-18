const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: ['@expo/vector-icons', 'react-native']
    }
  }, argv);

  // Add polyfills for web
  if (!config.resolve.fallback) {
    config.resolve.fallback = {};
  }
  
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    process: require.resolve('process/browser'),
    vm: false,
  };
  
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    // Map platform-specific files
    './notifications': './notifications.web',
  };

  // Add web-specific extensions before others
  config.resolve.extensions = [
    '.web.ts',
    '.web.tsx',
    '.web.js',
    '.web.jsx',
    ...config.resolve.extensions || []
  ];

  config.plugins.push(
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    })
  );

  // Set publicPath for GitHub Pages subdirectory deployment
  if (process.env.EXPO_PUBLIC_URL) {
    config.output.publicPath = process.env.EXPO_PUBLIC_URL;
  }

  return config;
};
