import { redirect } from 'react-router';

import { getServerAuth } from './auth.server';

/**
 * Require authentication - throws 401 if not authenticated
 * Returns headers that MUST be included in the response
 */
export async function requireAuth(request: Request) {
  const auth = await getServerAuth(request);

  if (!auth.user) {
    const url = new URL(request.url);
    const next = encodeURIComponent(url.pathname + url.search);
    throw redirect(`/auth?next=${next}`, { headers: auth.headers });
  }

  return { user: auth.user, headers: auth.headers, session: auth.session };
}
