import { serverEnv } from '~/lib/env.server';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/usage';

function unauthorizedResponse() {
  return Response.json({ error: 'Authentication required' }, { status: 401 });
}

export async function loader({ request, context }: Route.LoaderArgs) {
  if (!context.get(userContext)) {
    return unauthorizedResponse();
  }

  const cookie = request.headers.get('cookie');
  const response = await fetch(new URL('/api/usage', serverEnv.HOMINEM_INTERNAL_API_URL), {
    headers: cookie ? { cookie } : undefined,
  });

  return new Response(response.body, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
  });
}
