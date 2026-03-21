import { createClient as createTransportClient } from '../client'
import type { RpcTransportClient } from '../client'

import type { ClientConfig } from './api-client';
import { HonoHttpError } from './http-error';

export type RawHonoClient = RpcTransportClient

export function createRawHonoClient(config: ClientConfig): RawHonoClient {
  return createTransportClient(config.baseUrl, {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const token = await config.getAuthToken();
      const headers = new Headers(init?.headers);
      const extraHeaders = await config.getHeaders?.();

      if (extraHeaders) {
        Object.entries(extraHeaders).forEach(([key, value]) => {
          headers.set(key, value);
        });
      }

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
          const errorText = await response.text().catch(() => '');
          const errorMessage =
            errorText.length > 0 ? errorText : `Request failed with status ${response.status}`;
          throw new HonoHttpError(errorMessage, response.status, errorText);
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
