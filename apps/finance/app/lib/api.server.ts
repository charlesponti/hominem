import type { AppType } from '@hominem/api/types';
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
  const client = hc<AppType>(serverEnv.HOMINEM_INTERNAL_API_URL, {
    fetch: customFetch(request),
  });

  return { finance: client.api.finance };
}
