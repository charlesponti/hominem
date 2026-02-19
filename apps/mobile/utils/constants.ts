import Constants from 'expo-constants'

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string
  supabaseUrl?: string
  supabaseAnonKey?: string
  aiSdkChatWebEnabled?: string
  aiSdkChatMobileEnabled?: string
  aiSdkTranscribeEnabled?: string
  aiSdkSpeechEnabled?: string
}

const hostUri = Constants.expoConfig?.hostUri ?? Constants.manifest2?.extra?.expoClient?.hostUri
const localHost = hostUri ? hostUri.split(':').shift() : null

const configuredApiBaseUrl = extra.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || ''
const fallbackApiBaseUrl = localHost ? `http://${localHost}:3000` : 'http://localhost:3000'
const isProductionRuntime = process.env.NODE_ENV === 'production'

if (!configuredApiBaseUrl && isProductionRuntime) {
  throw new Error(
    'Missing API base URL. Set EXPO_PUBLIC_API_BASE_URL in mobile runtime configuration.',
  )
}

export const API_BASE_URL = configuredApiBaseUrl || fallbackApiBaseUrl

export const SUPABASE_URL = extra.supabaseUrl || process.env.EXPO_PUBLIC_SUPABASE_URL || ''
export const SUPABASE_ANON_KEY =
  extra.supabaseAnonKey || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || ''

const toBooleanFlag = (value: string | undefined) => value === 'true'

export const AI_SDK_CHAT_WEB_ENABLED = toBooleanFlag(
  extra.aiSdkChatWebEnabled || process.env.EXPO_PUBLIC_AI_SDK_CHAT_WEB_ENABLED,
)
export const AI_SDK_CHAT_MOBILE_ENABLED = toBooleanFlag(
  extra.aiSdkChatMobileEnabled || process.env.EXPO_PUBLIC_AI_SDK_CHAT_MOBILE_ENABLED,
)
export const AI_SDK_TRANSCRIBE_ENABLED = toBooleanFlag(
  extra.aiSdkTranscribeEnabled || process.env.EXPO_PUBLIC_AI_SDK_TRANSCRIBE_ENABLED,
)
export const AI_SDK_SPEECH_ENABLED = toBooleanFlag(
  extra.aiSdkSpeechEnabled || process.env.EXPO_PUBLIC_AI_SDK_SPEECH_ENABLED,
)
