import { useAuthContext } from '@hominem/auth';
import { Button } from '@hominem/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/components/ui/dropdown-menu';
import {
  ChartLine,
  CircleDollarSignIcon,
  Landmark,
  LogOut,
  MenuIcon,
  Settings,
} from 'lucide-react';
import { useCallback } from 'react';
import { href, Link, useNavigate } from 'react-router';

const APP_NAME = 'Finance';

const navItems = [
  {
    title: 'Finance',
    icon: CircleDollarSignIcon,
    url: '/finance',
  },
  {
    title: 'Analytics',
    icon: ChartLine,
    url: '/analytics',
  },
  {
    title: 'Accounts',
    icon: Landmark,
    url: '/accounts',
  },
];

const NavigationMenu = () => {
  const navigate = useNavigate();
  const { logout } = useAuthContext();
  const onLogoutClick = useCallback(async () => {
    await logout();
    navigate('/');
  }, [logout, navigate]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className=" px-2 text-primary focus-visible:ring-2 ring-primary focus-visible:"
        >
          <MenuIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align="end"
        sideOffset={8}
        avoidCollisions={true}
        side="bottom"
      >
        {navItems.map((item) => (
          <DropdownMenuItem key={item.title} asChild className=" py-2">
            {/* @ts-ignore */}
            <Link to={href(item.url)} prefetch="intent" className="flex items-center space-x-2">
              {item.icon && <item.icon className="size-4" />}
              <span>{item.title}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem asChild className=" py-2">
          <Link to={href('/account')} prefetch="intent" className="flex items-center space-x-2">
            <Settings className="size-4" />
            <span>Account</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className=" py-2 flex items-center space-x-2" onClick={onLogoutClick}>
          <LogOut className="size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

function Header() {
  const { isAuthenticated, isLoading } = useAuthContext();

  return (
    <header
      className="fixed top-0 left-0 z-50 w-full bg-background/10 backdrop-blur-md border-b border-border/50"
      style={{ paddingRight: 'var(--removed-body-scroll-bar-size, 0px)' }}
    >
      <div className="flex px-2 py-4 md:px-8 items-center justify-between">
        <Link to="/" prefetch="intent" className="flex items-center space-x-1">
          <img src="/logo-finance.png" alt={APP_NAME} className="size-6" />
          <span className="heading-2 text-primary">{APP_NAME}</span>
        </Link>
        {!isLoading && (
          <div className="flex items-center space-x-2">
            {isAuthenticated ? <NavigationMenu /> : <SignInButton />}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;

const SignInButton = () => {
  const { authClient } = useAuthContext();

  const onSignInClick = useCallback(async () => {
    await authClient.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/')}`,
      },
    });
  }, [authClient.auth]);

  return (
    <Button onClick={onSignInClick} className="flex ">
      Sign In with Apple
    </Button>
  );
};
