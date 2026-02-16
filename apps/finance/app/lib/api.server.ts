import type { HonoClientInstance } from '@hominem/hono-client';

import { createHonoClient } from '@hominem/hono-rpc/client';

/**
 * Create a server-side API client with optional authentication
 */
export function createServerHonoClient(
  accessToken?: string,
  request?: Request,
): HonoClientInstance {
  // Support both Vite env (client/build) and process.env (server/runtime)
  const baseUrl =
    import.meta.env.VITE_PUBLIC_API_URL ||
    (typeof process !== 'undefined' && process.env.VITE_PUBLIC_API_URL) ||
    'http://localhost:4040';

  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }
  const cookieHeader = request?.headers.get('Cookie');
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const client = createHonoClient(baseUrl, {
    headers,
  });

  return client as HonoClientInstance;
}
