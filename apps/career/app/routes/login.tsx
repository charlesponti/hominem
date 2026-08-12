import { redirect } from 'react-router';

import { hostedLoginUrl } from '~/lib/hosted-auth.server';

import { Route } from './+types/login';

export function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  throw redirect(hostedLoginUrl(url.searchParams.get('next')));
}

export default function LoginRedirect() {
  return null;
}
