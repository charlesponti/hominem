import {
  buildAuthCallbackErrorRedirect,
  getAuthCookieDomain,
  resolveSafeAuthRedirect,
} from '@hominem/auth/server';
import { redirect } from 'react-router';

import { serverEnv } from '~/lib/env';

const ALLOWED_REDIRECT_PREFIXES = ['/finance', '/import', '/accounts', '/analytics', '/account', '/settings']

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
 *
 * This is the server-side half of the passkey sign-in flow:
 *   client: passkey/auth/verify → Better Auth session
 *   client: token-from-session → { accessToken, refreshToken, ... }
 *   client: POST /auth/passkey/callback with canonical tokens
 *   server: set cookies → redirect to app
 */
export async function action({ request }: { request: Request }) {
  let payload: PasskeyCallbackPayload;
  try {
    payload = (await request.json()) as PasskeyCallbackPayload;
  } catch {
    return redirect(
      buildAuthCallbackErrorRedirect({
        next: null,
        fallback: '/finance',
        allowedPrefixes: ALLOWED_REDIRECT_PREFIXES,
        description: 'Passkey sign-in failed. Please try again.',
      }),
    );
  }

  const next = resolveSafeAuthRedirect(payload.next, '/finance', ALLOWED_REDIRECT_PREFIXES);
  const { accessToken, refreshToken, expiresIn } = payload;

  if (!accessToken) {
    return redirect(
      buildAuthCallbackErrorRedirect({
        next: payload.next,
        fallback: '/finance',
        allowedPrefixes: ALLOWED_REDIRECT_PREFIXES,
        description: 'Passkey sign-in failed. Please try again.',
      }),
    );
  }

  const headers = new Headers();
  const cookieDomain = getAuthCookieDomain();
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
