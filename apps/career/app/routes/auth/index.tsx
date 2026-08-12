import { redirect } from 'react-router';

import { careerAuthConfig, hostedLoginUrl } from '~/lib/hosted-auth.server';
import { userContext } from '~/lib/middleware';

import { Route } from './+types/index';
export async function loader({ request, context }: Route.LoaderArgs) {
  const user = context.get(userContext);

  if (user) {
    throw redirect(careerAuthConfig.fallback);
  }
  const next = new URL(request.url).searchParams.get('next');
  throw redirect(hostedLoginUrl(request, next));
}

export default function AuthEntryPage() {
  return null;
}
