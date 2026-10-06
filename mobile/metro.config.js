// metro.config.js — stubs out native-only packages when bundling for web
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const WEB_STUBS = [
  'react-native-reanimated',
  'react-native-gesture-handler',
  'react-native-worklets',
];

const stubPath = path.resolve(__dirname, 'src/stubs/nativeOnlyStub.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB_STUBS.includes(moduleName)) {
    return { type: 'sourceFile', filePath: stubPath };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
