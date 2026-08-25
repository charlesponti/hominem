import { serverEnv } from '~/lib/env.server';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/usage-timeseries';

function unauthorizedResponse() {
  return Response.json({ error: 'Authentication required' }, { status: 401 });
}

export async function loader({ request, context }: Route.LoaderArgs) {
  if (!context.get(userContext)) {
    return unauthorizedResponse();
  }

  const requestUrl = new URL(request.url);
  const apiUrl = new URL('/api/usage/timeseries', serverEnv.HOMINEM_INTERNAL_API_URL);
  for (const key of ['from', 'to', 'granularity']) {
    const value = requestUrl.searchParams.get(key);
    if (value) apiUrl.searchParams.set(key, value);
  }

  const cookie = request.headers.get('cookie');
  const response = await fetch(apiUrl, {
    headers: cookie ? { cookie } : undefined,
    signal: request.signal,
  });

  return new Response(response.body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  });
}
