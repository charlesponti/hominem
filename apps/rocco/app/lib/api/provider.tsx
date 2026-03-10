import { useAuthContext, useSafeAuth } from '@hominem/auth';
import { HonoProvider as BaseHonoProvider } from '@hominem/hono-client/react';
import type { CreateClient } from '@hominem/hono-client';
import { createHonoClient } from '@hominem/hono-rpc/client';
import { useCallback } from 'react';
import type { ReactNode } from 'react';

const createAppHonoClient: CreateClient = (baseUrl, options) => createHonoClient(baseUrl, options);

/**
 * Hono Provider Inner for Rocco App
 */
function HonoProviderInner({ children, baseUrl }: HonoProviderProps) {
  const { authClient } = useAuthContext();

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

  return (
    <BaseHonoProvider
      config={{
        baseUrl,
        createClient: createAppHonoClient,
        getAuthToken,
        onError: (error) => {
          console.error('Hono API error:', error);
        },
      }}
    >
      {children}
    </BaseHonoProvider>
  );
}

/**
 * Hono Provider for Rocco App
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
  const authContext = useSafeAuth();

  if (!authContext) {
    return (
      <BaseHonoProvider
        config={{
          baseUrl,
          createClient: createAppHonoClient,
          getAuthToken: async () => null,
          onError: (error) => {
            console.error('Hono API error:', error);
          },
        }}
      >
        {children}
      </BaseHonoProvider>
    );
  }

  return <HonoProviderInner baseUrl={baseUrl}>{children}</HonoProviderInner>;
}
