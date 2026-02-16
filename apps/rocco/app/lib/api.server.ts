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
  const headers: Record<string, string> = {};
  if (accessToken) {
    headers.authorization = `Bearer ${accessToken}`;
  }
  const cookieHeader = request?.headers.get('Cookie');
  if (cookieHeader) {
    headers.cookie = cookieHeader;
  }

  const client = createHonoClient(serverEnv.VITE_PUBLIC_API_URL, {
    headers,
  });

  return client as HonoClientInstance;
}
