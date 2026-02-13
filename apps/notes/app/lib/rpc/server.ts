import type { HonoClientInstance } from '@hominem/hono-client';

import { createHonoClient } from '@hominem/hono-rpc/client';

/**
 * Create a server-side Hono client with optional authentication
 */
export function createServerHonoClient(
  accessToken?: string,
  request?: Request,
): HonoClientInstance {
  let url: string;
  if (request) {
    const requestUrl = new URL(request.url);
    url = requestUrl.origin;
  } else {
    url = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:4040';
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

// `HonoClient` here is the concrete return type from `hc<AppType>` (the raw client).
// Use the canonical `HonoClientInstance` exported from `@hominem/hono-client`.
export type HonoClient = HonoClientInstance;
