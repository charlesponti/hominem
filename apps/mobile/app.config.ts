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
    aiSdkChatWebEnabled: string
    aiSdkChatMobileEnabled: string
    aiSdkTranscribeEnabled: string
    aiSdkSpeechEnabled: string
    mobilePasskeyEnabled: string
  }
}

function getAssociatedDomains() {
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
    'expo-web-browser',
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
    userInterfaceStyle: 'dark',
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
      appleTeamId: process.env.EXPO_APPLE_TEAM_ID,
      associatedDomains: getAssociatedDomains(),
      bundleIdentifier: variantConfig.bundleIdentifier,
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
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
