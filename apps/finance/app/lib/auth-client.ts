import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { serverEnv } from './env';

export const authClient = createAuthClient({
  baseURL: serverEnv.VITE_PUBLIC_API_URL,
  plugins: [emailOTPClient()],
});
