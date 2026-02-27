import { redirect } from 'react-router';

import { getServerAuth } from '~/lib/auth.server';

export async function loader({ request }: { request: Request }) {
  const { user, headers } = await getServerAuth(request);
  const url = new URL(request.url);
  const rawReturnTo = url.searchParams.get('return_to');
  const returnTo =
    rawReturnTo && rawReturnTo.startsWith('/') && !rawReturnTo.startsWith('//')
      ? rawReturnTo
      : '/calendar';
  const redirectTo = `${url.origin}/auth/callback?next=${encodeURIComponent(returnTo)}`;

  if (!user) {
    const target = `/?error=${encodeURIComponent('Sign in with Apple before connecting Google')}`;
    return redirect(target, { headers });
  }

  const apiUrl = new URL('/api/auth/link/google/start', url.origin);
  apiUrl.searchParams.set('redirect_uri', redirectTo);
  return redirect(apiUrl.toString(), { headers });
}
