import { redirect } from 'react-router';

import { getServerAuth } from './auth.server';
import { hostedLoginUrl } from './hosted-auth.server';

/**
 * Require authentication - throws 401 if not authenticated
 * Returns headers that MUST be included in the response
 */
export async function requireAuth(request: Request) {
  const auth = await getServerAuth(request);

  if (!auth.user) {
    const url = new URL(request.url);
    throw redirect(hostedLoginUrl(url.pathname + url.search), { headers: auth.headers });
  }

  return { user: auth.user, headers: auth.headers };
}
