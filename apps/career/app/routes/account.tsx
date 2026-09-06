import { CareerRepository } from '@hominem/db/career';
import { db } from '@hominem/db/core';

import { AccountSettingsPage } from '~/components/account/AccountSettingsPage';
import { handleAccountAction } from '~/lib/account/account.actions.server';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/account';

export const meta = () => [{ title: 'Account | career' }];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  const profile = await CareerRepository.getProfile(db, user.id);
  if (!profile) {
    throw new Response('Profile not found', { status: 404 });
  }

  return { user, currentProfile: profile };
}

export async function action({ context, request }: Route.ActionArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  return handleAccountAction({ formData, user });
}

export default function AccountRoute({ loaderData }: Route.ComponentProps) {
  return <AccountSettingsPage loaderData={loaderData} />;
}
