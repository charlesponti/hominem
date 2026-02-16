import type { ReactNode } from 'react';

import { useSupabaseAuthContext } from '@hominem/auth';
import { HonoProvider as BaseHonoProvider } from '@hominem/hono-client/react';
import { createHonoClient } from '@hominem/hono-rpc/client';

import { getQueryClient } from '~/lib/get-query-client';

/**
 * Hono Provider for Notes App
 *
 * Configures the Hono RPC client with:
 * - API base URL from environment variables
 * - Authentication token from Supabase session
 * - Error handling configuration
 */

interface HonoProviderProps {
  children: ReactNode;
  baseUrl: string;
}

export function HonoProvider({ children, baseUrl }: HonoProviderProps) {
  const { supabase } = useSupabaseAuthContext();
  const queryClient = getQueryClient();

  return (
    <BaseHonoProvider
      queryClient={queryClient}
      config={{
        baseUrl,
        createClient: createHonoClient,
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
      {children}
    </BaseHonoProvider>
  );
}
