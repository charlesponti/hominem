import { Outlet, data } from 'react-router';

import { userContext } from '~/lib/middleware';

import type { Route } from './+types/layout';

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  return data({ userId: user?.id ?? null });
}

export default function NotesLayout() {
  return (
    <div className="flex flex-col h-full">
      <Outlet />
    </div>
  );
}
