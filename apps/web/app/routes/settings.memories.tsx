import { MemoriesPage } from '~/components/account/settings-page';
import { RouteHeader } from '~/components/route-header';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/settings.memories';

export const meta = () => [{ title: 'Memories' }];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });
  return { user };
}

export default function SettingsMemoriesRoute() {
  return (
    <div className="h-full overflow-auto">
      <RouteHeader />
      <MemoriesPage />
    </div>
  );
}
