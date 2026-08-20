import { expoClient } from '@better-auth/expo/client';
import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';
import * as SecureStore from 'expo-secure-store';

import { API_BASE_URL, APP_SCHEME } from '~/constants';

function getAuthOriginHeader() {
  return new URL(API_BASE_URL).origin;
}

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  fetchOptions: {
    headers: {
      Origin: getAuthOriginHeader(),
    },
  },
  plugins: [
    expoClient({
      scheme: APP_SCHEME,
      storage: SecureStore,
      storagePrefix: 'mobile',
    }),
    emailOTPClient(),
  ],
});
