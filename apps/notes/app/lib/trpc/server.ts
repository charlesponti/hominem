import type { AppType } from '@hominem/hono-rpc';

import { hc } from 'hono/client';
import type { HonoClientInstance } from '@hominem/hono-client';

/**
 * Create a server-side Hono client with optional authentication
 */
export function createServerHonoClient(accessToken?: string): HonoClientInstance {
  const url = import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:4040';
  const client = hc<AppType>(url, {
    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : {},
  });
  return client as HonoClientInstance;
}

// `HonoClient` here is the concrete return type from `hc<AppType>` (the raw client).
// Use the canonical `HonoClientInstance` exported from `@hominem/hono-client`.
export type HonoClient = HonoClientInstance;
