import { useSupabaseAuthContext } from '@hominem/auth';
import { Button } from '@hominem/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/dropdown';
import { Globe2Icon, List, LogOut, MoreHorizontal, Settings, UserPlus } from 'lucide-react';
import { useCallback } from 'react';
import { href, Link, useNavigate } from 'react-router';

const APP_NAME = 'Rocco';

const NavigationMenu = () => {
  const navigate = useNavigate();
  const { logout } = useSupabaseAuthContext();
  const onLogoutClick = useCallback(async () => {
    await logout();
    navigate('/');
  }, [logout, navigate]);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="p-0.5">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56"
        align="end"
        sideOffset={8}
        avoidCollisions={true}
        side="bottom"
      >
        <DropdownMenuItem asChild className="cursor-pointer py-2">
          <Link to={href('/')} className="flex items-center space-x-2">
            <Globe2Icon className="size-4" />
            <span>Explore</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer py-2">
          <Link to={href('/lists')} className="flex items-center space-x-2">
            <List className="size-4" />
            <span>Lists</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer py-2">
          <Link to={href('/invites')} className="flex items-center space-x-2">
            <UserPlus className="size-4" />
            <span>Invites</span>
          </Link>
        </DropdownMenuItem>
        {/* <DropdownMenuItem asChild className="cursor-pointer py-2">
          <Link to={href('/trips')} className="flex items-center space-x-2">
            <MapPin className="size-4" />
            <span>Trips</span>
          </Link>
        </DropdownMenuItem> */}
        <DropdownMenuItem asChild className="cursor-pointer py-2">
          <Link to={href('/account')} className="flex items-center space-x-2">
            <Settings className="size-4" />
            <span>Account</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer py-2 flex items-center space-x-2"
          onClick={onLogoutClick}
        >
          <LogOut className="size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

function Header() {
  const { isAuthenticated, isLoading, supabase } = useSupabaseAuthContext();

  return (
    <header
      className="fixed top-0 left-0 z-50 w-full bg-background/10 backdrop-blur-md border-b border-border/50"
      style={{ paddingRight: 'var(--removed-body-scroll-bar-size, 0px)' }}
    >
      <div className="flex px-4 py-2 items-center justify-between">
        <Link to="/" className="flex items-center space-x-1">
          <img src="/icons/favicon-96x96.png" alt={APP_NAME} className="size-3 mt-1" />
          <span className="heading-4 lowercase text-primary">{APP_NAME}</span>
        </Link>
        {!isLoading && (
          <div className="flex items-center space-x-2">
            {isAuthenticated ? (
              <NavigationMenu />
            ) : (
              <Button
                onClick={() =>
                  supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/')}`,
                    },
                  })
                }
              >
                Sign in
              </Button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
