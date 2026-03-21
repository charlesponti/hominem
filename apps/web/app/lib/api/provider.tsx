import { useAuthContext, useSafeAuth } from '@hominem/auth';
import type { ClientConfig } from '@hominem/rpc';
import { HonoProvider as BaseHonoProvider } from '@hominem/rpc/react';
import type { ReactNode } from 'react';

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

function HonoProviderInner({ children, baseUrl }: HonoProviderProps) {
  useAuthContext();
  const queryClient = getQueryClient();

  const config: ClientConfig = {
    baseUrl,
    getAuthToken: async () => null,
    onError: (error) => {
      console.error('Hono API error:', error);
    },
  };

  return (
    <BaseHonoProvider queryClient={queryClient} config={config}>
      {children}
    </BaseHonoProvider>
  );
}

export function HonoProvider({ children, baseUrl }: HonoProviderProps) {
  // Check if AuthContext is available (client-side safe)
  const authContext = useSafeAuth();
  const config: ClientConfig = {
    baseUrl,
    getAuthToken: async () => null,
    onError: (error) => {
      console.error('Hono API error:', error);
    },
  };

  if (!authContext) {
    // During SSR, render without auth token support
    return (
      <BaseHonoProvider queryClient={getQueryClient()} config={config}>
        {children}
      </BaseHonoProvider>
    );
  }

  // On client-side, use auth token
  return <HonoProviderInner baseUrl={baseUrl}>{children}</HonoProviderInner>;
}
