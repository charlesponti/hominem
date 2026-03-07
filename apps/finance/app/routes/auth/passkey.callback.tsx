import { resolveSafeAuthRedirect } from '@hominem/auth/server';
import { redirect } from 'react-router';

interface PasskeyCallbackPayload {
  accessToken: string;
  next?: string;
}

/**
 * POST /auth/passkey/callback
 *
 * Receives the canonical token contract from a client-side passkey sign-in and
 * stores the access token in an HttpOnly cookie, then redirects to the app.
 *
 * This is the server-side half of the passkey sign-in flow:
 *   client: passkey/auth/verify → { accessToken, refreshToken, ... }
 *   client: POST /auth/passkey/callback with accessToken
 *   server: set cookie → redirect to app
 */
export async function action({ request }: { request: Request }) {
  let payload: PasskeyCallbackPayload;
  try {
    payload = (await request.json()) as PasskeyCallbackPayload;
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400 });
  }

  const next = resolveSafeAuthRedirect(payload.next, '/finance');
  const { accessToken } = payload;

  if (!accessToken) {
    return new Response(JSON.stringify({ error: 'missing_access_token' }), { status: 400 });
  }

  const headers = new Headers();
  headers.append(
    'set-cookie',
    `hominem_access_token=${encodeURIComponent(accessToken)}; Path=/; HttpOnly; SameSite=Lax`,
  );

  return redirect(next, { headers });
}
