import type { HonoClientInstance } from '@hominem/hono-client';

import { createHonoClient } from '@hominem/hono-rpc/client';
import { serverEnv } from '~/lib/env';

/**
 * Create a server-side Hono client with optional authentication
 */
export function createServerHonoClient(
  accessToken?: string,
  request?: Request,
): HonoClientInstance {
  const baseUrl = serverEnv.VITE_PUBLIC_API_URL;

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

// `HonoClient` here is the concrete return type from `hc<AppType>` (the raw client).
// Use the canonical `HonoClientInstance` exported from `@hominem/hono-client`.
export type HonoClient = HonoClientInstance;
