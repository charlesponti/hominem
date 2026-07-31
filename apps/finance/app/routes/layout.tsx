import { Spinner } from '@ponti-studios/ui/feedback';
import { AppNavigation, type AppNavigationLink } from '@ponti-studios/ui/navigation';
import { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

import { useUser } from '~/lib/hooks/use-user';

import { Toaster } from '../lib/toast';

const APP_NAME = 'Florin';
const LINKS: AppNavigationLink[] = [
  { href: '/finance', label: 'Finance' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/finance/affordability', label: 'Afford It?' },
];

function Header() {
  const location = useLocation();
  const user = useUser();
  const isAuthenticated = Boolean(user);

  const links = isAuthenticated ? [...LINKS, { href: '/account', label: 'Account' }] : [];
  const cta = isAuthenticated
    ? undefined
    : {
        href: '/auth',
        label: 'Log in',
        variant: 'outline' as const,
      };

  return (
    <AppNavigation
      brand={
        <span className="inline-flex items-center gap-2">
          <img src="/logo-finance.png" alt="" className="size-5" />
          {APP_NAME}
        </span>
      }
      brandHref="/"
      links={links}
      cta={cta}
      activeHref={location.pathname}
      linkComponent={Link}
      linkProp="to"
    />
  );
}

export default function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      {/* Single page frame: all routes inherit this width + padding. Do not re-add container shells in routes. */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center py-16">
              <Spinner size="md" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <Toaster />
    </div>
  );
}
