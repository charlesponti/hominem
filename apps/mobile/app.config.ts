import type { ConfigContext, ExpoConfig } from 'expo/config'

type AppVariant = 'dev' | 'e2e' | 'preview' | 'production'

interface VariantConfig {
  bundleIdentifier: string
  displayName: string
  updatesChannel: string | null
  scheme: string
  usesDevClient: boolean
}

const { getAppVariant, getAppVariantConfig } = require('./config/appVariant') as {
  getAppVariant: () => AppVariant
  getAppVariantConfig: (rawVariant?: string) => VariantConfig
}

const { EXPO_OWNER, EXPO_PROJECT_ID, getExpoExtraConfig } = require('./config/expo-config.js') as {
  EXPO_OWNER: string
  EXPO_PROJECT_ID: string
  getExpoExtraConfig: (env: Record<string, string | undefined>) => {
    apiBaseUrl: string
    e2eTesting: string
    e2eAuthSecret: string
    mobilePasskeyEnabled: string
  }
}

function getAssociatedDomains(appVariant: AppVariant) {
  // Only release variants need Associated Domains (for passkey webcredentials).
  // Dev/e2e provisioning profiles don't include the entitlement.
  if (appVariant === 'dev' || appVariant === 'e2e') {
    return undefined
  }

  const passkeyRpDomain = process.env.EXPO_PUBLIC_PASSKEY_RP_DOMAIN?.trim() || 'api.ponti.io'
  return [`webcredentials:${passkeyRpDomain}`]
}

function getUpdatesConfig(variantConfig: VariantConfig): ExpoConfig['updates'] {
  if (variantConfig.usesDevClient || variantConfig.updatesChannel === null) {
    return {
      enabled: false,
      checkAutomatically: 'NEVER',
      fallbackToCacheTimeout: 0,
    }
  }

  return {
    url: `https://u.expo.dev/${EXPO_PROJECT_ID}`,
    requestHeaders: {
      'expo-channel-name': variantConfig.updatesChannel,
    },
  }
}

function allowsLocalNetworking(appVariant: AppVariant) {
  return appVariant !== 'production'
}

export default ({ config }: ConfigContext) => {
  const appVariant = getAppVariant()
  const variantConfig = getAppVariantConfig(appVariant)
  const plugins: ExpoConfig['plugins'] = [
    'expo-router',
    './plugins/with-expo-dev-client-exclusion',
    [
      'expo-build-properties',
      {
        ios: {
          infoPlist: {
            NSAppTransportSecurity: {
              NSAllowsArbitraryLoads: false,
              NSAllowsLocalNetworking: allowsLocalNetworking(appVariant),
              NSExceptionDomains: {
                'railway.app': {
                  NSExceptionRequiresForwardSecrecy: true,
                  NSIncludesSubdomains: true,
                },
              },
            },
          },
          entitlements: {
            'keychain-access-groups': [
              `$(AppIdentifierPrefix)${variantConfig.bundleIdentifier}`,
            ],
          },
        },
      },
    ],
    [
      'expo-font',
      {
        fonts: [
          './assets/fonts/GeistMono-Regular.ttf',
          './assets/fonts/GeistMono-SemiBold.ttf',
          './assets/fonts/icons/fa-regular-400.ttf',
        ],
      },
    ],
    ['expo-secure-store'],
    'expo-localization',
    'expo-web-browser',
    'expo-asset',
    'expo-audio',
    'expo-sqlite',
    [
      'expo-notifications',
      {
        icon: './assets/icon.png',
        color: '#000000',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission: 'Allow Hakumi to access your camera to capture photos for notes.',
      },
    ],
    [
      'expo-media-library',
      {
        photosPermission: 'Allow Hakumi to save photos to your library.',
        savePhotosPermission: 'Allow Hakumi to save photos to your library.',
        isAccessMediaLocationEnabled: false,
      },
    ],
    [
      'expo-local-authentication',
      {
        faceIDPermission: 'Allow Hakumi to use Face ID to lock your app.',
      },
    ],
    [
      'expo-calendar',
      {
        calendarPermission: 'Allow Hakumi to access your calendar to add events.',
        remindersPermission: 'Allow Hakumi to access your reminders.',
      },
    ],
    [
      'react-native-vision-camera',
      {
        cameraPermissionText: 'Allow Hakumi to access your camera to capture photos for notes.',
        enableMicrophonePermission: false,
      },
    ],
    'expo-live-activity',
  ]

  if (variantConfig.usesDevClient) {
    plugins.splice(1, 0, [
      'expo-dev-client',
      {
        launchMode: 'most-recent',
      },
    ])
  }

  const extraConfig = getExpoExtraConfig(process.env)

  return {
    ...config,
    name: variantConfig.displayName,
    slug: 'hakumi',
    version: '1.0.0',
    scheme: variantConfig.scheme,
    owner: EXPO_OWNER,
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    assetBundlePatterns: ['**/*'],
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins,
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },
    newArchEnabled: true,
    ios: {
      icon: './assets/icon.png',
      appleTeamId: process.env.EXPO_APPLE_TEAM_ID ?? '3QHJ2KN8AL',
      associatedDomains: getAssociatedDomains(appVariant),
      bundleIdentifier: variantConfig.bundleIdentifier,
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ['fetch'],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#000000',
      },
      package: variantConfig.bundleIdentifier,
    },
    extra: {
      appVariant,
      appScheme: variantConfig.scheme,
      isDevClient: variantConfig.usesDevClient,
      ...extraConfig,
      eas: {
        projectId: EXPO_PROJECT_ID,
      },
    },
    runtimeVersion: {
      policy: 'fingerprint',
    },
    updates: getUpdatesConfig(variantConfig),
  }
}
