import Constants from 'expo-constants'
import * as SecureStore from 'expo-secure-store'
import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'

const getBaseUrl = () => {
  const extra = Constants.expoConfig?.extra as Record<string, string> | undefined
  if (extra?.apiBaseUrl) {
    return extra.apiBaseUrl
  }
  // Fallback for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4040'
  }
  return 'https://auth.ponti.io'
}

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: 'hakumi',
      storage: SecureStore,
      storagePrefix: 'hominem',
    }),
  ],
})
