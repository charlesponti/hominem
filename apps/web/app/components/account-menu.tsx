import { LogOut, Settings } from 'lucide-react';
import { Link, useNavigate } from 'react-router';

import { CollaborationNotifications } from '~/components/collaboration-notifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/dropdown-menu';
import { Button } from '~/components/ui/button';
import { useCollaborationInvites } from '~/hooks/use-collaboration-invites';
import type { User } from '~/lib/auth.server';

function getInitials(user: User) {
  const source = user.name.trim() || user.email;
  const parts = source.split(/\s+/).filter(Boolean);
  return parts.length > 1
    ? `${parts[0]?.[0] ?? ''}${parts.at(-1)?.[0] ?? ''}`.toUpperCase()
    : (parts[0]?.slice(0, 2).toUpperCase() ?? '?');
}

export function AccountMenu({ user }: { user: User }) {
  const navigate = useNavigate();
  const { count } = useCollaborationInvites();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button aria-label="Open account menu" className="relative" size="icon-sm" variant="ghost">
          <span className="flex size-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
            {getInitials(user)}
          </span>
          {count > 0 ? (
            <span
              aria-label="Unread notifications"
              className="absolute top-1 right-1 size-2 rounded-full bg-destructive"
            />
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
        <CollaborationNotifications />
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" viewTransition>
            <Settings />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            if (window.confirm('Are you sure you want to sign out?')) navigate('/logout');
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
