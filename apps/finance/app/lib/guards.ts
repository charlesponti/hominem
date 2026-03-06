import { getServerAuth } from './auth.server';
import { redirect } from 'react-router';

/**
 * Require authentication - throws 401 if not authenticated
 * Returns headers that MUST be included in the response
 */
export async function requireAuth(request: Request) {
  const auth = await getServerAuth(request);

  if (!auth.user) {
    throw redirect('/auth');
  }

  return { user: auth.user, headers: auth.headers, session: auth.session };
}
