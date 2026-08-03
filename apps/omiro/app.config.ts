import type { ConfigContext, ExpoConfig } from 'expo/config';
import { z } from 'zod';

const EXPO_OWNER = 'pontistudios';
const EXPO_PROJECT_ID = '4dfac82b-644f-4ff3-be42-e8f941287aa1';
const APPLE_TEAM_ID = '3QHJ2KN8AL';
const RELEASE_CHANNELS = ['production'] as const;
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
} as const);

const ROOT_ASSETS_DIR = './assets';

type AppEnvironment = keyof typeof APP_ENVIRONMENTS;
type AppEnvironmentConfig = (typeof APP_ENVIRONMENTS)[AppEnvironment];
type ReleaseChannel = (typeof RELEASE_CHANNELS)[number];
const appEnvironmentSchema = z.enum(['development', 'e2e', 'production', 'screenshots']);

function getBrandAssetPaths(appEnvironment: AppEnvironment): { icon: string; splash: string } {
  const icon = `${ROOT_ASSETS_DIR}/${ENVIRONMENT_ICON_NAMES[appEnvironment]}`;
  return {
    icon,
    splash: `${ROOT_ASSETS_DIR}/logo.splash-screen.png`,
  };
}

function getAppEnvironment(rawEnvironment = process.env.APP_ENV ?? 'development'): AppEnvironment {
  return appEnvironmentSchema.parse(rawEnvironment);
}

function getAppEnvironmentConfig(
  rawEnvironment = process.env.APP_ENV ?? 'development',
): AppEnvironmentConfig {
  return APP_ENVIRONMENTS[getAppEnvironment(rawEnvironment)];
}

function getReleaseChannel(appEnvironment: AppEnvironment): ReleaseChannel | null {
  return RELEASE_CHANNELS.includes(appEnvironment as ReleaseChannel)
    ? (appEnvironment as ReleaseChannel)
    : null;
}

function usesDevelopmentClient(appEnvironment: AppEnvironment) {
  return appEnvironment === 'development';
}

function getRuntimeVersion(appEnvironment: AppEnvironment): ExpoConfig['runtimeVersion'] {
  if (!RELEASE_CHANNELS.includes(appEnvironment as ReleaseChannel)) {
    return undefined;
  }

  return { policy: 'fingerprint' };
}

function getUpdatesConfig(
  appEnvironment: AppEnvironment,
  releaseChannel: ReleaseChannel | null,
): ExpoConfig['updates'] {
  if (appEnvironment !== 'production') {
    return {
      enabled: false,
      checkAutomatically: 'NEVER',
      fallbackToCacheTimeout: 0,
    };
  }

  return {
    url: `https://u.expo.dev/${EXPO_PROJECT_ID}`,
    requestHeaders: {
      'expo-channel-name': releaseChannel,
    },
  };
}

function allowsLocalNetworking(appEnvironment: AppEnvironment) {
  return appEnvironment === 'development' || appEnvironment === 'e2e';
}

export default ({ config }: ConfigContext) => {
  const appEnvironment = getAppEnvironment();
  const appEnvironmentConfig = getAppEnvironmentConfig(appEnvironment);
  const brandAssets = getBrandAssetPaths(appEnvironment);
  const releaseChannel = getReleaseChannel(appEnvironment);
  const runtimeVersion = getRuntimeVersion(appEnvironment);
  const hasDevelopmentClient = usesDevelopmentClient(appEnvironment);
  const plugins: ExpoConfig['plugins'] = [
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
    assetBundlePatterns: ['assets/**/*', 'api/**/*', 'app/**/*', 'constants/**/*', 'hooks/**/*', 'navigation/**/*', 'services/**/*'],
    plugins,
    experiments: {
      tsconfigPaths: true,
    },
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
        // Opt out of iOS 26's Liquid Glass redesign for system chrome (nav
        // bars, back buttons, toolbars) app-wide — restores the prior UIKit
        // appearance instead of the translucent glass material.
        UIDesignRequiresCompatibility: true,
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
    ...(runtimeVersion ? { runtimeVersion } : {}),
    updates: getUpdatesConfig(appEnvironment, releaseChannel),
  };
};

const ENVIRONMENT_ICON_NAMES = Object.freeze({
  development: 'icon.dev.png',
  e2e: 'icon.dev.png',
  production: 'icon.png',
  screenshots: 'icon.png',
} as const satisfies Record<AppEnvironment, string>);
