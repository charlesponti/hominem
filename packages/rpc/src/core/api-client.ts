import type { AppType } from '@hominem/api/types';
import { hc } from 'hono/client';

export interface ClientConfig {
  baseUrl: string;
  request?: Request;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  onError?: (error: Error) => void;
  throwOnError?: boolean;
}

export const customFetch =
  (config: ClientConfig): typeof fetch =>
  async (input, init) => {
    const headers = new Headers(init?.headers);
    const cookie = config.request?.headers.get('cookie');
    const extraHeaders = await config.getHeaders?.();

    if (cookie) headers.set('cookie', cookie);
    if (extraHeaders) {
      for (const [key, value] of new Headers(extraHeaders)) headers.set(key, value);
    }

    try {
      const response = await fetch(input, {
        ...init,
        headers,
        credentials: 'include',
      });

      if (config.throwOnError !== false && !response.ok) {
        const errorText = await response.text().catch(() => '');
        const message =
          errorText.length > 0 ? errorText : `Request failed with status ${response.status}`;
        const error = Object.assign(new Error(message), { status: response.status });
        throw error;
      }

      return response;
    } catch (error: unknown) {
      if (config.onError && error instanceof Error) {
        config.onError(error);
      }
      throw error;
    }
  };

export type HonoClient = ReturnType<typeof hc<AppType>>;

export function createApiClient(config: ClientConfig): HonoClient {
  return hc<AppType>(config.baseUrl, { fetch: customFetch(config) });
}
