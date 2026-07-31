import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

import { clientEnv } from './env.client';

export const authClient = createAuthClient({
  baseURL: clientEnv.VITE_PUBLIC_API_URL,
  plugins: [emailOTPClient()],
});

export function useAuthContext() {
  const { data: session, isPending: isLoading } = authClient.useSession();
  return {
    user: session?.user ?? null,
    session: session?.session ?? null,
    userId: session?.user?.id ?? null,
    isLoading,
    logout: () => authClient.signOut(),
  };
}
