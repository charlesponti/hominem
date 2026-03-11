import { redirect } from 'react-router';
import { getAuthCookieDomain } from '@hominem/auth/server';
import { getSetCookieHeaders } from '@hominem/utils/headers';

import { serverEnv } from '~/lib/env';

export async function action({ request }: { request: Request }) {
  const headers = new Headers();
  const upstreamHeaders = new Headers();
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    upstreamHeaders.set('cookie', cookieHeader);
  }

  try {
    const response = await fetch(`${serverEnv.VITE_PUBLIC_API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: upstreamHeaders,
    });
    for (const value of getSetCookieHeaders(response.headers)) {
      headers.append('set-cookie', value);
    }
  } catch {
    const cookieDomain = getAuthCookieDomain();
    const domainAttribute = cookieDomain ? `; Domain=${cookieDomain}` : '';
    headers.append(
      'set-cookie',
      `hominem_access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${domainAttribute}`,
    );
    headers.append(
      'set-cookie',
      `hominem_refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${domainAttribute}`,
    );
  }

  return redirect('/auth', { headers });
}

export async function loader() {
  return redirect('/auth');
}
