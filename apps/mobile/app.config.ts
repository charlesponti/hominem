import type { ConfigContext, ExpoConfig } from 'expo/config'

export default ({ config }: ConfigContext): ExpoConfig => {
  const NODE_ENV = String(process.env.NODE_ENV ?? 'production')

  let bundleIdentifier: string
  let name: string

  switch (NODE_ENV) {
    // case "development":
    //   bundleIdentifier = "com.pontistudios.mindsherpa.dev";
    //   name = "mindsherpa-dev";
    //   break;
    case 'preview':
    case 'production':
    default:
      bundleIdentifier = 'com.pontistudios.mindsherpa'
      name = 'mindsherpa'
  }

  return {
    ...config,
    name,
    slug: 'mindsherpa',
    version: '1.0.0',
    scheme: 'mindsherpa',
    owner: 'pontistudios',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    assetBundlePatterns: ['**/*'],
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-dev-launcher',
        {
          launchMode: 'most-recent',
        },
      ],
      'expo-apple-authentication',
      'expo-build-properties',
      [
        'expo-font',
        {
          fonts: [
            './assets/fonts/Plus_Jakarta_Sans.ttf',
            './assets/fonts/icons/fa-regular-400.ttf',
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
      [
        '@sentry/react-native',
        {
          url: 'https://sentry.io/',
          project: 'mindsherpa-ios',
          organization: 'ponti-studios',
        },
      ],
      'expo-web-browser',
    ],
    experiments: {
      typedRoutes: true,
      tsconfigPaths: true,
    },
    ios: {
      bundleIdentifier,
      supportsTablet: true,
      usesAppleSignIn: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: bundleIdentifier,
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
      eas: {
        projectId: '6c717814-8866-46bc-b11f-edeedd1b7a69',
      },
    },
    runtimeVersion: '1.0.0',
    updates: {
      url: 'https://u.expo.dev/6c717814-8866-46bc-b11f-edeedd1b7a69',
    },
  }
}
