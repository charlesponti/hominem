import { MemoriesPage } from '~/components/account/settings-page';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/settings.memories';

export const meta = () => [{ title: 'Memories' }];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });
  return { user };
}

export default function SettingsMemoriesRoute() {
  return <MemoriesPage />;
}
