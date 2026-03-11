'use client';

import { useSafeAuth } from '@hominem/auth';
import { Button } from '@hominem/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/dropdown';
import { LogOut, Settings, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

export interface NavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

export interface HeaderProps {
  brandName: string;
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
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY.current) < 10) return;
      setHidden(y > lastY.current && y > 60);
      lastY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
      className={[
        'flex items-center gap-1.5 px-3 py-2 rounded text-xs font-medium tracking-widest uppercase transition-colors duration-150',
        isActive
          ? 'text-text-primary'
          : 'text-text-tertiary hover:text-text-secondary',
      ].join(' ')}
    >
      {item.icon && <item.icon className="size-4 shrink-0" aria-hidden="true" />}
      <span>{item.title}</span>
    </Link>
  );
}

function DesktopNav({ navItems }: { navItems: NavItem[] }) {
  const onLogoutClick = useLogout();

  return (
    <div className="hidden md:flex items-center gap-1">
      {navItems.map((item) => (
        <DesktopNavLink key={item.url} item={item} />
      ))}

      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account and settings"
            className="ml-2 text-text-tertiary hover:text-text-primary focus-visible:ring-2 ring-white/20"
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

// ─── Mobile: bottom tab bar, mirrors NativeTabs exactly ───────────────────────

function MobileTabItem({ item }: { item: NavItem }) {
  const isActive = useIsActive(item.url);
  return (
    <li className="flex-1">
      <Link
        to={item.url}
        prefetch="intent"
        aria-current={isActive ? 'page' : undefined}
        className={[
          'flex flex-col items-center justify-center gap-1 w-full h-full min-h-[44px] transition-colors duration-150',
          isActive ? 'text-text-primary' : 'text-text-tertiary',
        ].join(' ')}
      >
        {item.icon && <item.icon className="size-6 shrink-0" aria-hidden="true" />}
        <span className="text-[10px] font-medium tracking-widest uppercase leading-none">
          {item.title}
        </span>
      </Link>
    </li>
  );
}

function MobileTabBar({ navItems }: { navItems: NavItem[] }) {
  return (
    <nav
      role="navigation"
      aria-label="Main"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(15, 17, 19, 0.92)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul role="list" className="flex h-14 m-0 p-0 list-none">
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

export function Header({ brandName, brandIcon, navItems = [] }: HeaderProps) {
  const authContext = useSafeAuth();
  const { isAuthenticated, isLoading } = authContext ?? {};
  const scrolledDown = useScrollDown();

  return (
    <>
      {/* Skip link — first focusable element (WCAG 2.4.1) */}
      <a
        href="#main-content"
        style={{
          position: 'absolute',
          top: '-100%',
          left: '1rem',
          zIndex: 9999,
          padding: '0.5rem 1rem',
          background: '#E7EAEE',
          color: '#0F1113',
          borderRadius: '0 0 6px 6px',
          fontSize: '0.9375rem',
          fontWeight: 600,
          textDecoration: 'none',
          transition: 'top 150ms ease',
        }}
        onFocus={(e) => { e.currentTarget.style.top = '0'; }}
        onBlur={(e) => { e.currentTarget.style.top = '-100%'; }}
      >
        Skip to main content
      </a>

      {/* Top bar — hides on scroll down (matching minimizeBehavior="onScrollDown") */}
      <header
        role="banner"
        className="fixed top-0 left-0 z-50 w-full"
        style={{
          background: 'rgba(15, 17, 19, 0.92)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          transform: scrolledDown ? 'translateY(-100%)' : 'translateY(0)',
          transition: 'transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          paddingRight: 'var(--removed-body-scroll-bar-size, 0px)',
        }}
      >
        <div className="flex h-14 md:h-16 px-4 md:px-8 items-center justify-between">
          <Link
            to="/"
            prefetch="intent"
            aria-label={`${brandName} home`}
            className="flex items-center gap-2 text-text-primary"
          >
            {brandIcon && <span aria-hidden="true">{brandIcon}</span>}
            <span className="text-sm font-semibold tracking-widest uppercase">{brandName}</span>
          </Link>

          {authContext && !isLoading && (
            isAuthenticated
              ? <DesktopNav navItems={navItems} />
              : <SignInButton />
          )}
        </div>
      </header>

      {/* Mobile bottom tab bar — visible only on mobile, mirrors NativeTabs */}
      {authContext && !isLoading && isAuthenticated && navItems.length > 0 && (
        <MobileTabBar navItems={navItems} />
      )}
    </>
  );
}
