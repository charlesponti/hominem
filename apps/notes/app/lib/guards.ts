import { redirect } from 'react-router';

import { getServerSession } from './auth.server';

/**
 * Require authentication - redirects to login if not authenticated
 * Returns headers that MUST be included in the response
 */
export async function requireAuth(request: Request) {
  const { user, headers } = await getServerSession(request);

  if (!user) {
    const url = new URL(request.url);
    const next = encodeURIComponent(url.pathname + url.search);
    throw redirect(`/?next=${next}`, { headers });
  }

  return { user, headers };
}
