import { Outlet, data } from 'react-router';

import { AccountMenu } from '~/components/account-menu';
import { TooltipProvider } from '~/components/ui/tooltip';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/layout';

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  return data({ user });
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  return (
    <TooltipProvider>
      <div className="flex h-[100dvh] w-full flex-col bg-background text-foreground">
        {loaderData.user ? (
          <header className="flex h-12 shrink-0 items-center justify-end border-b border-border px-3">
            <AccountMenu user={loaderData.user} />
          </header>
        ) : null}
        <div className="min-h-0 flex-1">
          <Outlet />
        </div>
      </div>
    </TooltipProvider>
  );
}
