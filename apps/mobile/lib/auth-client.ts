import { expoClient } from '@better-auth/expo/client'
import { emailOTPClient } from 'better-auth/client/plugins'
import { passkeyClient } from '@better-auth/passkey/client'
import { createAuthClient } from 'better-auth/react'
import * as SecureStore from 'expo-secure-store'

import { API_BASE_URL, APP_SCHEME } from '~/utils/constants'

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storage: SecureStore,
      storagePrefix: 'hominem',
    }),
    emailOTPClient(),
    passkeyClient(),
  ],
})
