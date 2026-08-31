import type { financeRoutes } from '@hominem/api/finance';
import { hc } from 'hono/client';

import { serverEnv } from '~/lib/env.server';

const customFetch =
  (request?: Request): typeof fetch =>
  async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = new Headers(init?.headers);

    if (request) {
      const cookie = request.headers.get('cookie');
      if (cookie) headers.set('cookie', cookie);
    }

    return fetch(input, { ...init, headers, credentials: 'include' });
  };

export function createServerHonoClient(request?: Request) {
  const finance = hc<typeof financeRoutes>(
    new URL('/api/finance', serverEnv.HOMINEM_INTERNAL_API_URL).toString(),
    { fetch: customFetch(request) },
  );

  return { finance };
}
