import { ArchivedChatsPage } from '~/components/account/settings-page';
import { RouteHeader } from '~/components/route-header';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/settings.archived-chats';

export const meta = () => [{ title: 'Archived chats' }];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });
  return { user };
}

export default function ArchivedChatsRoute() {
  return (
    <div className="h-full overflow-auto">
      <RouteHeader />
      <ArchivedChatsPage />
    </div>
  );
}
