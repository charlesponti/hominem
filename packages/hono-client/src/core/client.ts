import type { AppType } from '@hominem/hono-rpc';
import type { HonoClientType } from '@hominem/hono-rpc/client';

import { hc } from 'hono/client';

export interface ClientConfig {
  baseUrl: string;
  getAuthToken: () => Promise<string | null>;
  onError?: (error: Error) => void;
}

// Full `HonoClient` class used by the application. Wraps `hc<AppType>` and handles
// auth/fetch behavior (used by hooks and components). Distinct from the lightweight
// SSR `HonoClient` type defined in `packages/hono-client/src/ssr/server.ts`.
export class HonoClient {
  private client: HonoClientInstance;

  constructor(config: ClientConfig) {
    this.client = hc<AppType>(config.baseUrl, {
      fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
        const token = await config.getAuthToken();
        const headers = new Headers(init?.headers);

        if (token) {
          headers.set('Authorization', `Bearer ${token}`);
        }

        try {
          const response = await fetch(input, {
            ...init,
            headers,
            credentials: 'include',
          });

          // Throw on non-OK responses so React Query can handle them as errors
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
            const errorMessage = errorData.error || `Request failed with status ${response.status}`;
            throw new Error(errorMessage);
          }

          return response;
        } catch (error: unknown) {
          if (config.onError && error instanceof Error) {
            config.onError(error);
          }
          throw error;
        }
      },
    });
  }

  get api() {
    return (this.client as any).api;
  }
}

// Re-export the client type from hono-rpc/client (computed at source to avoid type depth limits)
export type HonoClientInstance = HonoClientType;
