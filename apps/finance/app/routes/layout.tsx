import { Spinner } from '@ponti-studios/ui/feedback';
import { Navigation } from '@ponti-studios/ui/navigation';
import { Button } from '@ponti-studios/ui/primitives';
import { Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router';

import { useUser } from '~/lib/hooks/use-user';

import { Toaster } from '../lib/toast';

const APP_NAME = 'Florin';

interface NavLink {
  href: string;
  label: string;
}

const LINKS: NavLink[] = [
  { href: '/finance', label: 'Finance' },
  { href: '/analytics', label: 'Analytics' },
  { href: '/accounts', label: 'Accounts' },
  { href: '/finance/affordability', label: 'Afford It?' },
];

function isActive(pathname: string, href: string) {
  if (href === pathname) return true;
  return href !== '/' && pathname.startsWith(`${href}/`);
}

function Header() {
  const location = useLocation();
  const user = useUser();
  const isAuthenticated = Boolean(user);

  const links: NavLink[] = isAuthenticated
    ? [...LINKS, { href: '/account', label: 'Account' }]
    : [];

  return (
    <Navigation>
      <Navigation.Brand>
        <Link to="/" className="inline-flex items-center gap-2">
          <img src="/logo-finance.png" alt="" className="size-5" />
          {APP_NAME}
        </Link>
      </Navigation.Brand>

      <Navigation.List>
        {links.map((link) => (
          <Navigation.Item key={link.href} asChild active={isActive(location.pathname, link.href)}>
            <Link to={link.href}>{link.label}</Link>
          </Navigation.Item>
        ))}
      </Navigation.List>

      {!isAuthenticated && (
        <Navigation.Action>
          <Button variant="outline" asChild>
            <Link to="/auth">Log in</Link>
          </Button>
        </Navigation.Action>
      )}
    </Navigation>
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
