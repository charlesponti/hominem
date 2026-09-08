import type { careerRoutes } from '@hominem/api/career';
import { customFetch } from '@hominem/rpc/fetch';
import { hc } from 'hono/client';

import { serverEnv } from './env.server';

export function createServerHonoClient(request?: Request) {
  const career = hc<typeof careerRoutes>(
    new URL('/api/career', serverEnv.HOMINEM_INTERNAL_API_URL).toString(),
    {
      fetch: customFetch({
        baseUrl: serverEnv.HOMINEM_INTERNAL_API_URL,
        request,
        throwOnError: false,
      }),
    },
  );

  return { career };
}
