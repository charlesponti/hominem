import type { careerRoutes } from '@hominem/api/career';
import type { PortfolioRecord } from '@hominem/db';
import { hc } from 'hono/client';

import { serverEnv } from './env';

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

// Split client: type only the career sub-app (not the full AppType) to keep
// tsgo's type inference tractable — see https://github.com/orgs/honojs/discussions/2380
function createServerHonoClient(request?: Request) {
  const career = hc<typeof careerRoutes>(
    new URL('/api/career', serverEnv.VITE_PUBLIC_API_URL).toString(),
    { fetch: customFetch(request) },
  );

  return { career };
}

export async function fetchCurrentPortfolio(request: Request): Promise<PortfolioRecord | null> {
  const { career } = createServerHonoClient(request);
  const res = await career.portfolio.$get();
  const data = await res.json();
  return data.portfolio;
}
