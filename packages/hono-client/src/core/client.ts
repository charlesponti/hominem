import type { HonoClientOptions, HonoClientType } from '@hominem/hono-rpc/client';

export type HonoClientInstance = HonoClientType;
export type HonoClient = HonoClientInstance;

export type CreateClient = (baseUrl: string, options?: HonoClientOptions) => HonoClientInstance;

export interface ClientConfig {
  baseUrl: string;
  getAuthToken: () => Promise<string | null>;
  createClient: CreateClient;
  onError?: (error: Error) => void;
}

// Factory to create a configured Hono client with auth + error handling.
export function createHonoClient(config: ClientConfig): HonoClientInstance {
  return config.createClient(config.baseUrl, {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
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

        // Log response details for debugging
        const contentType = response.headers.get('content-type');
        const contentLength = response.headers.get('content-length');
        const contentEncoding = response.headers.get('content-encoding');

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
          const errorMessage = errorData.error || `Request failed with status ${response.status}`;
          console.error(`[HonoClient] Error response: ${response.status}`, { url, contentType, contentLength, contentEncoding, body: errorData });
          throw new Error(errorMessage);
        }

        return response;
      } catch (error: unknown) {
        console.error(`[HonoClient] Fetch error:`, { url, error });
        if (config.onError && error instanceof Error) {
          config.onError(error);
        }
        throw error;
      }
    },
  });
}
