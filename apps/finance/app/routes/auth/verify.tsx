import { redirect } from 'react-router';

import { hostedLoginUrl } from '~/lib/hosted-auth.server';

import type { Route } from './+types/verify';

/**
 * Legacy verify URL — OTP now lives on /auth as a client step.
 * Preserve deep links that include ?email=.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  throw redirect(hostedLoginUrl(request, url.searchParams.get('next')));
}

export default function AuthVerifyRedirect() {
  return null;
}
