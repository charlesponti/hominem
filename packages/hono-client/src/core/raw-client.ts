import { createHonoClient as createRpcClient } from '@hominem/hono-rpc/client';
import type { HonoClientType } from '@hominem/hono-rpc/client';

import type { ClientConfig } from './api-client';

export type RawHonoClient = HonoClientType;

export function createRawHonoClient(config: ClientConfig): RawHonoClient {
  return createRpcClient(config.baseUrl, {
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
