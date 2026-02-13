import type { HonoClientInstance } from '@hominem/hono-client';

import { createHonoClient } from '@hominem/hono-rpc/client';

/**
 * Create a server-side Hono client with optional authentication
 */
export function createServerHonoClient(
  accessToken?: string,
  request?: Request,
): HonoClientInstance {
  let url = import.meta.env.VITE_PUBLIC_API_URL;
  if (!url) {
    if (request) {
      const requestUrl = new URL(request.url);
      url = requestUrl.hostname.includes('localhost')
        ? 'http://localhost:4040'
        : `${requestUrl.protocol}//api.${requestUrl.hostname}`;
    } else {
      url = 'http://localhost:4040';
    }
  }

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }
  const cookieHeader = request?.headers.get('Cookie');
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const client = createHonoClient(url, {
    headers,
  });

  return client as HonoClientInstance;
}
