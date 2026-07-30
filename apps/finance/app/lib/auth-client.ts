import { emailOTPClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/react';

const apiBaseUrl = import.meta.env.VITE_AUTH_API_URL ?? import.meta.env.VITE_PUBLIC_API_URL;

if (!apiBaseUrl) {
  throw new Error('VITE_PUBLIC_API_URL is required');
}

export const authClient = createAuthClient({
  baseURL: apiBaseUrl,
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
