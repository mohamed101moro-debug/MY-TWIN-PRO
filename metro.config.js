const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [
  ...(config.resolver.assetExts || []),
  'mp3',
  'wav',
  'ttf',
  'otf',
];

config.resolver.sourceExts = [
  ...(config.resolver.sourceExts || []),
  'sql',
  'txt',
  'jsonl',
];

module.exports = config;
