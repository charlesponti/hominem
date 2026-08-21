import { redirect } from 'react-router';

import { webAuthConfig, hostedLoginUrl } from '~/lib/hosted-auth.server';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/index';

export async function loader({ request, context }: Route.LoaderArgs) {
  const user = context.get(userContext);

  if (user) {
    throw redirect(webAuthConfig.fallback);
  }
  const next = new URL(request.url).searchParams.get('next');
  throw redirect(hostedLoginUrl(next));
}

export default function AuthEntryPage() {
  return null;
}
