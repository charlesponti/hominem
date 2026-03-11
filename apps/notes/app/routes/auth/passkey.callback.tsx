import { buildAuthCallbackErrorRedirect, resolveSafeAuthRedirect } from '@hominem/auth/server';
import { redirect } from 'react-router';

import { serverEnv } from '~/lib/env';

const ALLOWED_REDIRECT_PREFIXES = ['/', '/chat', '/notes', '/account', '/settings']

interface PasskeyCallbackPayload {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  next?: string;
}

/**
 * POST /auth/passkey/callback
 *
 * Receives the canonical token contract from a client-side passkey sign-in and
 * stores the access token in an HttpOnly cookie, then redirects to the app.
 */
export async function action({ request }: { request: Request }) {
  let payload: PasskeyCallbackPayload;
  try {
    payload = (await request.json()) as PasskeyCallbackPayload;
  } catch {
    return redirect(
      buildAuthCallbackErrorRedirect({
        next: null,
        fallback: '/notes',
        allowedPrefixes: ALLOWED_REDIRECT_PREFIXES,
        description: 'Passkey sign-in failed. Please try again.',
      }),
    );
  }

  const next = resolveSafeAuthRedirect(payload.next, '/notes', ALLOWED_REDIRECT_PREFIXES);
  const { accessToken, refreshToken, expiresIn } = payload;

  if (!accessToken) {
    return redirect(
      buildAuthCallbackErrorRedirect({
        next: payload.next,
        fallback: '/notes',
        allowedPrefixes: ALLOWED_REDIRECT_PREFIXES,
        description: 'Passkey sign-in failed. Please try again.',
      }),
    );
  }

  const headers = new Headers();
  const cookieDomain = serverEnv.AUTH_COOKIE_DOMAIN?.trim();
  const domainAttribute = cookieDomain ? `; Domain=${cookieDomain}` : '';
  headers.append(
    'set-cookie',
    `hominem_access_token=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Lax${
      typeof expiresIn === 'number' ? `; Max-Age=${expiresIn}` : ''
    }${domainAttribute}`,
  );
  if (refreshToken) {
    headers.append(
      'set-cookie',
      `hominem_refresh_token=${encodeURIComponent(refreshToken)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${domainAttribute}`,
    );
  }

  return redirect(next, { headers });
}
