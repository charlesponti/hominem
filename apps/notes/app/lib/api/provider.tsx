import { useAuthContext, useSafeAuth } from '@hominem/auth';
import type { ClientConfig } from '@hominem/hono-client';
import { HonoProvider as BaseHonoProvider } from '@hominem/hono-client/react';
import { createHonoClient } from '@hominem/hono-rpc/client';
import { useCallback } from 'react';
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
  const { authClient } = useAuthContext();
  const queryClient = getQueryClient();

  const getAuthToken = useCallback(async () => {
    try {
      const { data } = await authClient.auth.getSession();
      return data?.session?.access_token || null;
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to get auth token:', error.message);
      } else {
        console.error('Failed to get auth token:', error);
      }
      return null;
    }
  }, [authClient]);

  const config: ClientConfig = {
    baseUrl,
    createClient: (nextBaseUrl, options) => createHonoClient(nextBaseUrl, options),
    getAuthToken,
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
    createClient: (nextBaseUrl, options) => createHonoClient(nextBaseUrl, options),
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
