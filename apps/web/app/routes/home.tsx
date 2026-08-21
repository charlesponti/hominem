import { redirect } from 'react-router';

import { hostedLoginUrl } from '~/lib/hosted-auth.server';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/home';

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (user) {
    throw redirect('/notes');
  }
  const next = new URL(request.url).searchParams.get('next');
  throw redirect(hostedLoginUrl(next));
}

export default function HomePage() {
  return null;
}
