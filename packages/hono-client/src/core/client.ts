import type { AppType } from '@hominem/hono-rpc';

import { hc } from 'hono/client';

export interface ClientConfig {
  baseUrl: string;
  getAuthToken: () => Promise<string | null>;
  onError?: (error: Error) => void;
}

export class HonoClient {
  private client: ReturnType<typeof hc<AppType>>;
  private config: ClientConfig;

  constructor(config: ClientConfig) {
    this.config = config;
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
        } catch (error) {
          if (config.onError && error instanceof Error) {
            config.onError(error);
          }
          throw error;
        }
      },
    });
  }

  get api() {
    return this.client.api;
  }
}
