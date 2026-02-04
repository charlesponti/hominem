import type { HonoClientInstance } from '@hominem/hono-client';

import { createHonoClient } from '@hominem/hono-rpc/client';

/**
 * Create a server-side Hono client with optional authentication
 */
export function createServerHonoClient(accessToken?: string): HonoClientInstance {
  const url = import.meta.env.VITE_PUBLIC_API_URL;
  const client = createHonoClient(url, {
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  });

  return client as HonoClientInstance;
}
