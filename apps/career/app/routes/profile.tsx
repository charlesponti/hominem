import { CareerRepository, db } from '@hominem/db';

import { ProfilePage } from '~/components/account/ProfilePage';
import { handleAccountAction } from '~/lib/account/account.actions.server';
import { loadProfilePageData } from '~/lib/account/account.loader.server';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/profile';

export const meta = () => [{ title: 'Profile | career' }];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  const profile = await CareerRepository.getProfile(db, user.id);
  if (!profile) {
    throw new Response('Profile not found', { status: 404 });
  }

  return loadProfilePageData({ user, currentProfile: profile });
}

export async function action({ context, request }: Route.ActionArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  return handleAccountAction({ formData, user });
}

export default function ProfileRoute({ loaderData }: Route.ComponentProps) {
  return <ProfilePage loaderData={loaderData} />;
}
