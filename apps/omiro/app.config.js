const { z } = require('zod');

// Keep this schema local because Expo evaluates the dynamic config during native builds.
// It is intentionally duplicated from env.ts's appEnvironmentSchema rather than shared.
const appEnvironmentSchema = z.enum(['development', 'e2e', 'production', 'screenshots']);

const EXPO_OWNER = 'pontistudios';
const EXPO_PROJECT_ID = '4dfac82b-644f-4ff3-be42-e8f941287aa1';
const APPLE_TEAM_ID = '3QHJ2KN8AL';
const DEVELOPMENT_APP_CONFIG = Object.freeze({
  bundleIdentifier: 'com.pontistudios.hakumi.dev',
  displayName: 'Omiro Dev',
  scheme: 'hakumi-dev',
});
const PRODUCTION_APP_CONFIG = Object.freeze({
  bundleIdentifier: 'com.pontistudios.hakumi',
  displayName: 'Omiro',
  scheme: 'hakumi',
});
const APP_ENVIRONMENTS = Object.freeze({
  development: DEVELOPMENT_APP_CONFIG,
  e2e: DEVELOPMENT_APP_CONFIG,
  production: PRODUCTION_APP_CONFIG,
  screenshots: PRODUCTION_APP_CONFIG,
});

const ROOT_ASSETS_DIR = './assets';

const ENVIRONMENT_ICON_NAMES = Object.freeze({
  development: 'icon.dev.png',
  e2e: 'icon.dev.png',
  production: 'icon.png',
  screenshots: 'icon.png',
});

function getBrandAssetPaths(appEnvironment) {
  const icon = `${ROOT_ASSETS_DIR}/${ENVIRONMENT_ICON_NAMES[appEnvironment]}`;
  return {
    icon,
    splash: `${ROOT_ASSETS_DIR}/logo.splash-screen.png`,
  };
}

/**
 * EAS injects EAS_BUILD_PROFILE on the remote builder and it can't be
 * shadowed by a local .env file the way APP_ENV can (see the incident where
 * a locally-run "production" build picked up .env.development.local's
 * ambient APP_ENV and silently shipped the dev bundle identity to the App
 * Store). On the builder, EAS_BUILD_PROFILE is treated as the source of
 * truth and a conflicting APP_ENV is a hard error rather than a guess.
 */
function getAppEnvironment() {
  const appEnv = process.env.APP_ENV;

  if (process.env.EAS_BUILD === 'true') {
    const profile = process.env.EAS_BUILD_PROFILE;
    if (!profile) {
      throw new Error('EAS_BUILD is set but EAS_BUILD_PROFILE is missing.');
    }
    const resolvedProfile = appEnvironmentSchema.parse(profile);
    if (appEnv && appEnv !== resolvedProfile) {
      throw new Error(
        `APP_ENV ("${appEnv}") conflicts with EAS_BUILD_PROFILE ("${resolvedProfile}"). Refusing to guess which app identity to build.`,
      );
    }
    return resolvedProfile;
  }

  if (appEnv) {
    return appEnvironmentSchema.parse(appEnv);
  }

  if (process.env.CI === 'true') {
    throw new Error('APP_ENV must be set explicitly when running in CI.');
  }

  return 'development';
}

function getAppEnvironmentConfig(appEnvironment) {
  return APP_ENVIRONMENTS[appEnvironment];
}

// Only the production identity ships to the App Store, so only it gets a
// fingerprint runtimeVersion + EAS Update URL. The update channel itself is
// driven by eas.json's build profile `channel`, not set here, so the two
// can't drift out of sync.
function getRuntimeVersion(appEnvironment) {
  return appEnvironment === 'production' ? { policy: 'fingerprint' } : undefined;
}

function getUpdatesConfig(appEnvironment) {
  if (appEnvironment !== 'production') {
    return { enabled: false, checkAutomatically: 'NEVER', fallbackToCacheTimeout: 0 };
  }
  return { url: `https://u.expo.dev/${EXPO_PROJECT_ID}` };
}

function usesDevelopmentClient(appEnvironment) {
  return appEnvironment === 'development';
}

function allowsLocalNetworking(appEnvironment) {
  return appEnvironment === 'development' || appEnvironment === 'e2e';
}

function createConfig({ config }) {
  const appEnvironment = getAppEnvironment();
  const appEnvironmentConfig = getAppEnvironmentConfig(appEnvironment);
  const brandAssets = getBrandAssetPaths(appEnvironment);
  const hasDevelopmentClient = usesDevelopmentClient(appEnvironment);
  const runtimeVersion = getRuntimeVersion(appEnvironment);
  const plugins = [
    'expo-router',
    '@sentry/react-native',
    './plugins/withPrivacyManifest',
    [
      'expo-build-properties',
      {
        ios: {
          deploymentTarget: '26.0',
          infoPlist: {
            NSAppTransportSecurity: {
              NSAllowsArbitraryLoads: false,
              NSAllowsLocalNetworking: allowsLocalNetworking(appEnvironment),
            },
          },
        },
      },
    ],
    [
      'expo-splash-screen',
      {
        image: brandAssets.splash,
        enableFullScreenImage_legacy: true,
        resizeMode: 'cover',
      },
    ],
    ['expo-secure-store'],
    'expo-asset',
    'expo-audio',
    'expo-image',
    'expo-localization',
    'expo-sharing',
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Omiro to access your camera to capture photos for notes.',
      },
    ],
    [
      'expo-media-library',
      {
        photosPermission: 'Allow Omiro to save photos to your library.',
        savePhotosPermission: 'Allow Omiro to save photos to your library.',
        isAccessMediaLocationEnabled: false,
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Allow Omiro to use Face ID to lock your app.',
      },
    ],
  ];

  if (hasDevelopmentClient) {
    plugins.splice(1, 0, [
      'expo-dev-client',
      {
        launchMode: 'most-recent',
      },
    ]);
  }

  return {
    ...config,
    name: appEnvironmentConfig.displayName,
    slug: 'hakumi',
    version: '1.0.1',
    scheme: appEnvironmentConfig.scheme,
    owner: EXPO_OWNER,
    platforms: ['ios'],
    orientation: 'portrait',
    icon: brandAssets.icon,
    userInterfaceStyle: 'automatic',
    backgroundColor: '#111113',
    assetBundlePatterns: ['assets/**/*', 'api/**/*', 'app/**/*', 'constants/**/*', 'hooks/**/*', 'navigation/**/*', 'services/**/*'],
    plugins,
    experiments: {
      tsconfigPaths: true,
    },
    ...(runtimeVersion ? { runtimeVersion } : {}),
    updates: getUpdatesConfig(appEnvironment),
    ios: {
      appleTeamId: APPLE_TEAM_ID,
      icon: brandAssets.icon,
      bundleIdentifier: appEnvironmentConfig.bundleIdentifier,
      supportsTablet: true,
      entitlements: {
        'com.apple.developer.siri': true,
        'keychain-access-groups': [`$(AppIdentifierPrefix)${appEnvironmentConfig.bundleIdentifier}`],
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSLocationWhenInUseUsageDescription:
          'Omiro may use your location only when you choose media that includes location details, so it can preserve context for your notes.',
        NSMicrophoneUsageDescription:
          'Allow Omiro to access your microphone to record voice notes on your device.',
        NSSpeechRecognitionUsageDescription:
          'Allow Omiro to transcribe recorded voice notes into text on your device.',
        NSCalendarsFullAccessUsageDescription:
          'Allow Omiro to read your calendar so on-device chat can answer questions about your schedule.',
      },
    },
    extra: {
      appEnvironment,
      appScheme: appEnvironmentConfig.scheme,
      isDevClient: hasDevelopmentClient,
      eas: {
        projectId: EXPO_PROJECT_ID,
      },
    },
  };
}

module.exports = createConfig;
module.exports.getAppEnvironment = getAppEnvironment;
