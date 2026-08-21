import { AccountSettingsPage } from '~/components/account/settings-page';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/settings';

export const meta = () => [{ title: 'Account settings' }];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });
  return { user };
}

export default function SettingsRoute({ loaderData }: Route.ComponentProps) {
  return <AccountSettingsPage user={loaderData.user} />;
}
