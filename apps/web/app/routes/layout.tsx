import { Outlet, data } from 'react-router';

import { TooltipProvider } from '~/components/ui/tooltip';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/layout';

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  return data({ userId: user?.id ?? null });
}

export default function Layout() {
  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] w-full flex-col bg-background text-foreground">
        <Outlet />
      </div>
    </TooltipProvider>
  );
}
