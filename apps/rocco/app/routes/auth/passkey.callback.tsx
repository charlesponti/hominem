import { buildAuthCallbackErrorRedirect, resolveSafeAuthRedirect } from '@hominem/auth/server';
import { redirect } from 'react-router';

const ALLOWED_REDIRECT_PREFIXES = ['/', '/about', '/account', '/invites', '/visits', '/lists', '/places', '/admin', '/settings']

interface PasskeyCallbackPayload {
  accessToken: string;
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
        fallback: '/visits',
        allowedPrefixes: ALLOWED_REDIRECT_PREFIXES,
        description: 'Passkey sign-in failed. Please try again.',
      }),
    );
  }

  const next = resolveSafeAuthRedirect(payload.next, '/visits', ALLOWED_REDIRECT_PREFIXES);
  const { accessToken } = payload;

  if (!accessToken) {
    return redirect(
      buildAuthCallbackErrorRedirect({
        next: payload.next,
        fallback: '/visits',
        allowedPrefixes: ALLOWED_REDIRECT_PREFIXES,
        description: 'Passkey sign-in failed. Please try again.',
      }),
    );
  }

  const headers = new Headers();
  headers.append(
    'set-cookie',
    `hominem_access_token=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Lax`,
  );

  return redirect(next, { headers });
}
