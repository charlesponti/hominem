import {
  buildAuthCallbackErrorRedirect,
  resolveSafeAuthRedirect,
} from '@hominem/auth/server-utils';
import { redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { AUTH_CONFIG } from './config';

export async function action({ request }: ActionFunctionArgs) {
  let payload: { next?: string };
  try {
    payload = (await request.json()) as { next?: string };
  } catch {
    return redirect(
      buildAuthCallbackErrorRedirect({
        next: null,
        fallback: AUTH_CONFIG.defaultRedirect,
        allowedPrefixes: [...AUTH_CONFIG.allowedRedirectPrefixes],
        description: 'Passkey sign-in failed. Please try again.',
      }),
    );
  }

  return redirect(
    resolveSafeAuthRedirect(payload.next, AUTH_CONFIG.defaultRedirect, [
      ...AUTH_CONFIG.allowedRedirectPrefixes,
    ]),
  );
}
