import Constants from 'expo-constants'

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string
  aiSdkChatWebEnabled?: string
  aiSdkChatMobileEnabled?: string
  aiSdkTranscribeEnabled?: string
  aiSdkSpeechEnabled?: string
  e2eTesting?: string
  e2eAuthSecret?: string
  appVariant?: string
  appScheme?: string
}

const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoClient?.hostUri
const localHost = hostUri ? hostUri.split(':').shift() : null

const configuredApiBaseUrl = extra.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || ''
const fallbackApiBaseUrl = localHost ? `http://${localHost}:3000` : 'http://localhost:3000'
const appVariant = extra.appVariant ?? process.env.APP_VARIANT ?? 'dev'
const isProductionRuntime = appVariant === 'production'

if (!configuredApiBaseUrl && isProductionRuntime) {
  throw new Error(
    'Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL in mobile runtime configuration.',
  )
}

export const API_BASE_URL = configuredApiBaseUrl || fallbackApiBaseUrl
export const APP_VARIANT = appVariant
export const APP_SCHEME = extra.appScheme || 'hakumi'

const toBooleanFlag = (value: string | undefined) => value === 'true'

const AI_SDK_CHAT_WEB_ENABLED = toBooleanFlag(
  extra.aiSdkChatWebEnabled || process.env.EXPO_PUBLIC_AI_SDK_CHAT_WEB_ENABLED,
)
export const AI_SDK_CHAT_MOBILE_ENABLED = toBooleanFlag(
  extra.aiSdkChatMobileEnabled || process.env.EXPO_PUBLIC_AI_SDK_CHAT_MOBILE_ENABLED,
)
const AI_SDK_TRANSCRIBE_ENABLED = toBooleanFlag(
  extra.aiSdkTranscribeEnabled || process.env.EXPO_PUBLIC_AI_SDK_TRANSCRIBE_ENABLED,
)
const AI_SDK_SPEECH_ENABLED = toBooleanFlag(
  extra.aiSdkSpeechEnabled || process.env.EXPO_PUBLIC_AI_SDK_SPEECH_ENABLED,
)

export const E2E_TESTING = toBooleanFlag(
  extra.e2eTesting || process.env.EXPO_PUBLIC_E2E_TESTING,
)

export const E2E_AUTH_SECRET = extra.e2eAuthSecret || process.env.EXPO_PUBLIC_E2E_AUTH_SECRET || ''
