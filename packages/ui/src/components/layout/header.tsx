import { useSafeAuth } from '@hominem/auth';
import { Button } from '@hominem/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/dropdown';
import { cn } from '@hominem/ui/lib/utils';
import { LogOut, Settings, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

export interface HeaderProps {
  brandIcon?: React.ReactNode;
  navItems?: NavItem[];
}

function useIsActive(url: string) {
  const { pathname } = useLocation();
  return pathname === url || pathname.startsWith(`${url}/`);
}

function useLogout() {
  const navigate = useNavigate();
  const authContext = useSafeAuth();
  return useCallback(async () => {
    await authContext?.logout();
    navigate('/');
  }, [authContext, navigate]);
}

/** Tracks scroll direction. Returns true when the user is scrolling down. */
function useScrollDown() {
  const { pathname } = useLocation();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    if (pathname.startsWith('/chat/')) {
      setHidden(false);
      return;
    }

    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY.current) < 10) return;
      setHidden(y > lastY.current && y > 60);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [pathname]);

  return hidden;
}

// ─── Desktop: inline nav links + account dropdown ─────────────────────────────

function DesktopNavLink({ item }: { item: NavItem }) {
  const isActive = useIsActive(item.url);
  return (
    <Link
      to={item.url}
      prefetch="intent"
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150',
        isActive ? 'text-accent' : 'text-text-secondary hover:text-text-primary',
      )}
    >
      {item.icon && <item.icon className="size-4 shrink-0" aria-hidden="true" />}
      <span>{item.title}</span>
    </Link>
  );
}

function DesktopNav({ navItems }: { navItems: NavItem[] }) {
  const onLogoutClick = useLogout();

  return (
    <div className="hidden items-center gap-1 md:flex">
      {navItems.length > 0 ? (
        <nav role="navigation" aria-label="Main" className="flex items-center">
          {navItems.map((item) => (
            <DesktopNavLink key={item.url} item={item} />
          ))}
        </nav>
      ) : null}

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account and settings"
            className="text-text-tertiary hover:text-text-primary"
          >
            <Settings className="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8}>
          <DropdownMenuItem asChild className="py-2">
            <Link to="/account" prefetch="intent" className="flex items-center gap-2">
              <Settings className="size-4" aria-hidden="true" />
              <span>Account</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="py-2 flex items-center gap-2" onClick={onLogoutClick}>
            <LogOut className="size-4" aria-hidden="true" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Mobile: bottom tab bar ────────────────────────────────────────────────────

function MobileTabItem({ item }: { item: NavItem }) {
  const isActive = useIsActive(item.url);
  return (
    <li className="flex-1">
      <Link
        to={item.url}
        prefetch="intent"
        aria-current={isActive ? 'page' : undefined}
        className={cn(
          'flex h-full min-h-11 w-full flex-col items-center justify-center gap-1 transition-colors duration-150',
          isActive ? 'text-accent' : 'text-text-tertiary',
        )}
      >
        {item.icon && <item.icon className="size-6 shrink-0" aria-hidden="true" />}
        <span className="text-[11px] font-medium leading-none">{item.title}</span>
      </Link>
    </li>
  );
}

function MobileTabBar({ navItems }: { navItems: NavItem[] }) {
  return (
    <nav
      role="navigation"
      aria-label="Main"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-border-subtle bg-background/95 supports-backdrop-filter:bg-background/85 supports-backdrop-filter:backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul role="list" className="mx-auto flex h-14 max-w-200 list-none px-2 py-1">
        {navItems.map((item) => (
          <MobileTabItem key={item.url} item={item} />
        ))}
      </ul>
    </nav>
  );
}

// ─── Sign-in button (unauthenticated state) ───────────────────────────────────

function SignInButton() {
  const onSignInClick = useCallback(() => {
    window.location.href = '/auth';
  }, []);
  return <Button onClick={onSignInClick}>Sign in</Button>;
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function Header({ brandIcon, navItems = [] }: HeaderProps) {
  const authContext = useSafeAuth();
  const { isAuthenticated, isLoading } = authContext ?? {};
  const scrolledDown = useScrollDown();

  return (
    <>
      <a
        href="#main-content"
        className="absolute left-4 top-0 z-9999 -translate-y-full rounded-b-md bg-foreground px-4 py-2 text-sm font-semibold text-background no-underline transition-transform focus:translate-y-0"
      >
        Skip to main content
      </a>

      <header
        role="banner"
        className="fixed left-0 top-0 z-50 w-full border-b border-border-subtle bg-background/95 supports-backdrop-filter:bg-background/85 supports-backdrop-filter:backdrop-blur-md"
        style={{
          transform: scrolledDown ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          paddingRight: 'var(--removed-body-scroll-bar-size, 0px)',
        }}
      >
        <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6 md:h-16">
          <Link
            to="/"
            prefetch="intent"
            aria-label={`home`}
            className="flex items-center gap-2 text-text-primary"
          >
            {brandIcon ? brandIcon : null}
          </Link>

          {authContext &&
            !isLoading &&
            (isAuthenticated ? <DesktopNav navItems={navItems} /> : <SignInButton />)}
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      {authContext && !isLoading && isAuthenticated && navItems.length > 0 && (
        <MobileTabBar navItems={navItems} />
      )}
    </>
  );
}
