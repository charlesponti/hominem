import { redirect } from 'react-router';

import { hostedLoginUrl } from '~/lib/hosted-auth.server';

import type { Route } from './+types/verify';

// old verify URL - OTP is now a client-side step on /auth, so just forward the ?next= param along

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  throw redirect(hostedLoginUrl(url.searchParams.get('next')));
}

export default function AuthVerifyRedirect() {
  return null;
}
