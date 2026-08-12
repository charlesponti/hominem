import { redirect } from 'react-router';

import { getServerAuth } from '~/lib/auth.server';
import { hostedLoginUrl } from '~/lib/hosted-auth.server';

import type { Route } from './+types/index';
export async function loader({ request }: Route.LoaderArgs) {
  const { user, headers } = await getServerAuth(request);
  if (user) {
    throw redirect('/finance', { headers });
  }
  const next = new URL(request.url).searchParams.get('next');
  throw redirect(hostedLoginUrl(next));
}

export default function AuthEntryPage() {
  return null;
}
