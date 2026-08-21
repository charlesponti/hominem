import { NavLink, Outlet, data } from 'react-router';

import { WEB_BRAND } from '~/lib/brand';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/layout';

function NavItem({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-full px-3 py-1.5 text-sm ${isActive ? 'bg-foreground text-background' : 'text-text-secondary'}`
      }
    >
      {label}
    </NavLink>
  );
}

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  return data({ userId: user?.id ?? null });
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { userId } = loaderData;

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-background text-foreground">
      {userId ? (
        <header className="border-b border-border-subtle bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4 md:px-6 lg:px-8">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-text-tertiary">
                {WEB_BRAND.appName}
              </p>
            </div>
            <nav className="flex items-center gap-2">
              <NavItem to="/notes" label="Notes" />
              <NavItem to="/chat" label="Chat" />
              <NavItem to="/account" label="Account" />
            </nav>
          </div>
        </header>
      ) : null}
      <main className="flex min-h-0 w-full flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  );
}
