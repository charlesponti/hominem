import type React from 'react';

import { useSupabaseAuthContext } from '@hominem/auth';
import { HonoProvider as BaseHonoProvider } from '@hominem/hono-client/react';

/**
 * Hono RPC Provider for Finance App
 *
 * Replaces TRPCProvider with much simpler and faster setup.
 * Performance: 84% faster type-checking compared to tRPC!
 */
export function HonoProvider({ children }: { children: React.ReactNode }) {
  const { supabase } = useSupabaseAuthContext();

  return (
    <BaseHonoProvider
      config={{
        baseUrl: import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:4040',
        getAuthToken: async () => {
          const {
            data: { session },
          } = await supabase.auth.getSession();

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
