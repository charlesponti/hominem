const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('node:path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);
const authSource = path.resolve(__dirname, '../../packages/auth/src');
const isDevelopment = process.env.APP_ENV === 'development';

// Shared ESM packages use explicit .js imports while the app consumes their
// TypeScript source. Metro needs the extensionless retry for those imports.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (isDevelopment && moduleName === '@ponti-studios/auth') {
    moduleName = path.join(authSource, 'index.ts');
  } else if (isDevelopment && moduleName.startsWith('@ponti-studios/auth/')) {
    moduleName = path.join(authSource, moduleName.slice('@ponti-studios/auth/'.length));
  }

  if (moduleName.endsWith('.js')) {
    try {
      return context.resolveRequest(context, moduleName, platform);
    } catch {
      return context.resolveRequest(context, moduleName.slice(0, -3), platform);
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
