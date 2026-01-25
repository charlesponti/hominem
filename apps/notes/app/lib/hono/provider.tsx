import type { ReactNode } from 'react';

import { useSupabaseAuthContext } from '@hominem/auth';
import { HonoProvider as BaseHonoProvider } from '@hominem/hono-client/react';

import { getQueryClient } from '~/lib/get-query-client';

/**
 * Hono Provider for Notes App
 *
 * Configures the Hono RPC client with:
 * - API base URL from environment variables
 * - Authentication token from Supabase session
 * - Error handling configuration
 */

export function HonoProvider({ children }: { children: ReactNode }) {
  const { supabase } = useSupabaseAuthContext();
  const queryClient = getQueryClient();

  return (
    <BaseHonoProvider
      queryClient={queryClient}
      config={{
        baseUrl: import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3000',
        getAuthToken: async () => {
          try {
            const { data } = await supabase.auth.getSession();
            return data?.session?.access_token || null;
          } catch (error) {
            if (error instanceof Error) {
              console.error('Failed to get auth token:', error.message);
            } else {
              console.error('Failed to get auth token:', error);
            }
            return null;
          }
        },
        onError: (error) => {
          console.error('Hono API error:', error);
        },
      }}
    >
      {children as any}
    </BaseHonoProvider>
  );
}
