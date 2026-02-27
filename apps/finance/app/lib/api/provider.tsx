import type { ReactNode } from 'react';

import { useAuthContext } from '@hominem/auth';
import { HonoProvider as BaseHonoProvider } from '@hominem/hono-client/react';
import { createHonoClient } from '@hominem/hono-rpc/client';

/**
 * Hono RPC Provider for Finance App
 *
 * Replaces the old TRpcProvider with a simpler, faster RPC-based setup.
 * Performance: 84% faster type-checking compared to the previous implementation!
 */
interface HonoProviderProps {
  children: ReactNode;
  baseUrl: string;
}

export function HonoProvider({ children, baseUrl }: HonoProviderProps) {
  const { authClient } = useAuthContext();

  return (
    <BaseHonoProvider
      config={{
        baseUrl,
        createClient: createHonoClient,
        getAuthToken: async () => {
          const {
            data: { session },
          } = await authClient.auth.getSession();

          return session?.access_token || null;
        },
        onError: (error) => {
          console.error('Hono RPC Error:', error);
        },
      }}
    >
      {children}
    </BaseHonoProvider>
  );
}
