import type { ReactNode } from 'react';

import { useSupabaseAuthContext } from '@hominem/auth';
import { HonoProvider as BaseHonoProvider } from '@hominem/hono-client';

/**
 * Hono Provider for Rocco App
 *
 * Configures the Hono RPC client with:
 * - API base URL from environment variables
 * - Authentication token from Supabase session
 * - Error handling configuration
 */

export function HonoProvider({ children }: { children: ReactNode }) {
  const { supabase } = useSupabaseAuthContext();

  return (
    <BaseHonoProvider
      config={{
        baseUrl: import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:3000',
        getAuthToken: async () => {
          try {
            const { data } = await supabase.auth.getSession();
            return data?.session?.access_token || null;
          } catch (error) {
            console.error('Failed to get auth token:', error);
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
