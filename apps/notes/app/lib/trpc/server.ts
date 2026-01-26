import type { AppType } from '@hominem/hono-rpc';
import { hc } from 'hono/client';

export function createServerHonoClient(accessToken?: string) {
  return hc<AppType>(import.meta.env.VITE_PUBLIC_API_URL || 'http://localhost:4040', {
    headers: () =>
      accessToken
        ? {
            authorization: `Bearer ${accessToken}`,
          }
        : {},
  });
}

// Backwards compatibility alias
export const createServerTRPCClient = createServerHonoClient;
