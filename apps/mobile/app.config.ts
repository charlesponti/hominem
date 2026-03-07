import type { ConfigContext, ExpoConfig } from 'expo/config'

type AppVariant = 'dev' | 'e2e' | 'preview' | 'production'

interface VariantConfig {
  bundleIdentifier: string
  name: string
  updatesChannel: string | null
  appScheme: string
  usesDevClient: boolean
}

const APP_VARIANTS: Record<AppVariant, VariantConfig> = {
  dev: {
    bundleIdentifier: 'com.pontistudios.hakumi.dev',
    name: 'hakumi-dev',
    updatesChannel: 'development',
    appScheme: 'hakumi-dev',
    usesDevClient: true,
  },
  e2e: {
    bundleIdentifier: 'com.pontistudios.hakumi.e2e',
    name: 'hakumi-e2e',
    updatesChannel: null,
    appScheme: 'hakumi-e2e',
    usesDevClient: false,
  },
  preview: {
    bundleIdentifier: 'com.pontistudios.hakumi.preview',
    name: 'hakumi-preview',
    updatesChannel: 'preview',
    appScheme: 'hakumi-preview',
    usesDevClient: false,
  },
  production: {
    bundleIdentifier: 'com.pontistudios.hakumi',
    name: 'hakumi',
    updatesChannel: 'production',
    appScheme: 'hakumi',
    usesDevClient: false,
  },
}

function getAppVariant(): AppVariant {
  const rawVariant = String(process.env.APP_VARIANT ?? 'dev')
  if (rawVariant in APP_VARIANTS) {
    return rawVariant as AppVariant
  }

  throw new Error(`Unsupported APP_VARIANT: ${rawVariant}`)
}

function allowsLocalNetworking(appVariant: AppVariant) {
  return appVariant !== 'production'
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const appVariant = getAppVariant()
  const variantConfig = APP_VARIANTS[appVariant]
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
          './assets/fonts/GeistMono-Medium.ttf',
          './assets/fonts/GeistMono-SemiBold.ttf',
          './assets/fonts/icons/fa-brands-400.ttf',
          './assets/fonts/icons/fa-duotone-900.ttf',
          './assets/fonts/icons/fa-light-300.ttf',
          './assets/fonts/icons/fa-regular-400.ttf',
          './assets/fonts/icons/fa-sharp-duotone-solid-900.ttf',
          './assets/fonts/icons/fa-sharp-light-300.ttf',
          './assets/fonts/icons/fa-sharp-regular-400.ttf',
          './assets/fonts/icons/fa-sharp-solid-900.ttf',
          './assets/fonts/icons/fa-sharp-thin-100.ttf',
          './assets/fonts/icons/fa-solid-900.ttf',
          './assets/fonts/icons/fa-thin-100.ttf',
          './assets/fonts/icons/fa-v4compatibility.ttf',
        ],
      },
    ],
    [
      'expo-av',
      {
        microphonePermission: 'Allow $(PRODUCT_NAME) to access your microphone.',
      },
    ],
    ['expo-secure-store'],
    'expo-web-browser',
    '@react-native-community/datetimepicker',
    ['expo-sqlite'],
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
    name: variantConfig.name,
    slug: 'hakumi',
    version: '1.0.0',
    scheme: variantConfig.appScheme,
    owner: 'cponti44',
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
      appScheme: variantConfig.appScheme,
      isDevClient: String(variantConfig.usesDevClient),
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      e2eTesting: process.env.EXPO_PUBLIC_E2E_TESTING,
      e2eAuthSecret: process.env.EXPO_PUBLIC_E2E_AUTH_SECRET,
      aiSdkChatWebEnabled: process.env.EXPO_PUBLIC_AI_SDK_CHAT_WEB_ENABLED,
      aiSdkChatMobileEnabled: process.env.EXPO_PUBLIC_AI_SDK_CHAT_MOBILE_ENABLED,
      aiSdkTranscribeEnabled: process.env.EXPO_PUBLIC_AI_SDK_TRANSCRIBE_ENABLED,
      aiSdkSpeechEnabled: process.env.EXPO_PUBLIC_AI_SDK_SPEECH_ENABLED,
      eas: {
        projectId: '4dfac82b-644f-4ff3-be42-e8f941287aa1',
      },
    },
    runtimeVersion: {
      policy: 'fingerprint',
    },
    updates:
      variantConfig.updatesChannel === null
        ? undefined
        : {
            url: 'https://u.expo.dev/4dfac82b-644f-4ff3-be42-e8f941287aa1',
            requestHeaders: {
              'expo-channel-name': variantConfig.updatesChannel,
            },
          },
  }
}
