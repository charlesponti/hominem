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
    url: 'https://u.expo.dev/4dfac82b-644f-4ff3-be42-e8f941287aa1',
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

  return {
    ...config,
    name: variantConfig.displayName,
    slug: 'hakumi',
    version: '1.0.0',
    scheme: variantConfig.scheme,
    owner: 'pontistudios',
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
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      e2eTesting: process.env.EXPO_PUBLIC_E2E_TESTING,
      e2eAuthSecret: process.env.EXPO_PUBLIC_E2E_AUTH_SECRET,
      aiSdkChatWebEnabled: process.env.EXPO_PUBLIC_AI_SDK_CHAT_WEB_ENABLED,
      aiSdkChatMobileEnabled: process.env.EXPO_PUBLIC_AI_SDK_CHAT_MOBILE_ENABLED,
      aiSdkTranscribeEnabled: process.env.EXPO_PUBLIC_AI_SDK_TRANSCRIBE_ENABLED,
      aiSdkSpeechEnabled: process.env.EXPO_PUBLIC_AI_SDK_SPEECH_ENABLED,
      mobilePasskeyEnabled: process.env.EXPO_PUBLIC_MOBILE_PASSKEY_ENABLED,
      eas: {
        projectId: '4dfac82b-644f-4ff3-be42-e8f941287aa1',
      },
    },
    runtimeVersion: {
      policy: 'fingerprint',
    },
    updates: getUpdatesConfig(variantConfig),
  }
}
