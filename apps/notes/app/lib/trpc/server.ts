import type { AppType } from '@hominem/hono-rpc';

import { hc } from 'hono/client';

/**
 * Create a server-side Hono client with optional authentication
 */
export function createServerHonoClient(accessToken?: string) {
  const url = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:4040';
  const client = hc<AppType>(url, {
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  });
  return client as any;
}

export type HonoClient = ReturnType<typeof hc<AppType>>;
// Backwards compatibility alias
export const createServerTRPCClient = createServerHonoClient;
