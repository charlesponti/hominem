import Constants from 'expo-constants'

const extra = (Constants.expoConfig?.extra ?? {}) as {
  apiBaseUrl?: string
  supabaseUrl?: string
  supabaseAnonKey?: string
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
