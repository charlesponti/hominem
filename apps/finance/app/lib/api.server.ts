import type { financeRoutes } from '@hominem/api/finance';
import { customFetch } from '@hominem/rpc/fetch';
import { hc } from 'hono/client';

import { serverEnv } from '~/lib/env.server';

export function createServerHonoClient(request?: Request) {
  const finance = hc<typeof financeRoutes>(
    new URL('/api/finance', serverEnv.HOMINEM_INTERNAL_API_URL).toString(),
    {
      fetch: customFetch({
        baseUrl: serverEnv.HOMINEM_INTERNAL_API_URL,
        request,
        throwOnError: false,
      }),
    },
  );

  return { finance };
}
