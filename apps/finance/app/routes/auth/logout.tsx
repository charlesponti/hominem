import { redirect } from 'react-router';

import { serverEnv } from '~/lib/env';

export async function action() {
  const headers = new Headers();
  const cookieDomain = serverEnv.AUTH_COOKIE_DOMAIN?.trim();
  const domainAttribute = cookieDomain ? `; Domain=${cookieDomain}` : '';
  headers.append(
    'Set-Cookie',
    `hominem_access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${domainAttribute}`,
  );
  headers.append(
    'Set-Cookie',
    `hominem_refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${domainAttribute}`,
  );

  return redirect('/auth', { headers });
}

export async function loader() {
  return redirect('/auth');
}
