'use client';

import { useSafeAuth } from '@hominem/auth';
import { LogOut, MoreHorizontal, PenSquare, Search, Settings, Trash2, type LucideIcon } from 'lucide-react';
import { useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { cn } from '../../lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../ui/sidebar';

export interface SidebarNavItem {
  title: string;
  url: string;
  icon?: LucideIcon;
}

export interface RecentItem {
  id: string;
  title: string;
  url: string;
  updatedAt?: string | Date;
  onDelete?: (id: string) => void;
}

export interface AppSidebarProps {
  brandName: string;
  brandIcon?: React.ReactNode;
  navItems?: SidebarNavItem[];
  recentItems?: RecentItem[];
  newChatUrl?: string;
  onNewChat?: () => void;
  userDisplayName?: string;
  userAvatarUrl?: string;
  userEmail?: string;
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

function UserAvatar({ displayName, avatarUrl }: { displayName?: string; avatarUrl?: string }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName ?? 'User'}
        className="size-8 rounded-full object-cover"
      />
    );
  }
  const initials = displayName
    ? displayName
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?';
  return (
    <div className="flex size-8 items-center justify-center rounded-full bg-bg-surface text-foreground text-xs font-semibold select-none border border-border/60">
      {initials}
    </div>
  );
}

function NavItem({ item }: { item: SidebarNavItem }) {
  const isActive = useIsActive(item.url);
  return (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cn(
          'h-9 rounded-lg text-sm font-medium text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-transparent transition-colors px-2.5',
          isActive && 'text-sidebar-foreground font-semibold bg-transparent',
        )}
      >
        <Link to={item.url} prefetch="intent">
          {item.icon && <item.icon className="size-4 shrink-0" aria-hidden="true" />}
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar({
  brandName,
  brandIcon,
  navItems = [],
  recentItems = [],
  newChatUrl,
  onNewChat,
  userDisplayName,
  userAvatarUrl,
  userEmail,
}: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';
  const logout = useLogout();

  return (
    <Sidebar collapsible="offcanvas" className="border-r-0">
      {/* Header: brand + new chat */}
      <SidebarHeader className="px-3 pt-3 pb-1">
        <div className="flex items-center justify-between gap-2 h-10">
          {!isCollapsed && (
            <Link
              to="/"
              prefetch="intent"
              className="flex items-center gap-2 min-w-0 group"
              aria-label={`${brandName} home`}
            >
              {brandIcon && (
                <span aria-hidden="true" className="shrink-0">
                  {brandIcon}
                </span>
              )}
              <span className="text-sm font-semibold text-sidebar-foreground truncate group-hover:opacity-80 transition-opacity">
                {brandName}
              </span>
            </Link>
          )}
          <div className={cn('flex items-center gap-0.5 ml-auto shrink-0')}>
            {!isCollapsed && (newChatUrl || onNewChat) && (
              <button
                type="button"
                onClick={onNewChat}
                className="flex items-center justify-center size-8 rounded-lg text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-transparent transition-colors"
                title="New chat"
                aria-label="New chat"
              >
                <PenSquare className="size-4" />
              </button>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Search */}
        {!isCollapsed && (
          <SidebarGroup className="px-0 py-1">
            <SidebarGroupContent>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-sidebar-foreground/40 pointer-events-none" />
                <SidebarInput
                  placeholder="Search"
                  className="pl-8 h-9 bg-transparent border-0 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Primary nav */}
        {navItems.length > 0 && (
          <SidebarGroup className="px-0 py-1">
            <SidebarMenu>
              {navItems.map((item) => (
                <NavItem key={item.url} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Recent / history items - minimal text style */}
        {recentItems.length > 0 && !isCollapsed && (
          <SidebarGroup className="px-0 py-1 flex-1 min-h-0">
            <SidebarGroupContent>
              <ul className="flex flex-col gap-0.5">
                {recentItems.map((item) => (
                  <li key={item.id} className="group/item flex items-center rounded-lg hover:bg-transparent">
                    <Link
                      to={item.url}
                      prefetch="intent"
                      className="flex-1 min-w-0 px-2.5 py-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground/90 transition-colors truncate"
                    >
                      <span className="truncate">{item.title || 'Untitled'}</span>
                    </Link>
                    {item.onDelete && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="shrink-0 flex items-center justify-center size-7 mr-1 rounded-md text-sidebar-foreground/0 group-hover/item:text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
                            aria-label={`Options for ${item.title}`}
                          >
                            <MoreHorizontal className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent side="right" align="start">
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onSelect={() => item.onDelete?.(item.id)}
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </li>
                ))}
              </ul>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer: user profile - minimal */}
      <SidebarFooter className="px-3 pb-3 pt-1 border-t border-sidebar-border/40">
        <div className="flex items-center gap-2 py-1">
          <UserAvatar
            {...(userDisplayName !== undefined && { displayName: userDisplayName })}
            {...(userAvatarUrl !== undefined && { avatarUrl: userAvatarUrl })}
          />
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-sidebar-foreground truncate">
                {userDisplayName ?? 'Account'}
              </div>
              {userEmail && (
                <div className="text-xs text-sidebar-foreground/50 truncate">{userEmail}</div>
              )}
            </div>
          )}
          {!isCollapsed && (
            <div className="flex items-center gap-0.5 ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link
                to="/account"
                prefetch="intent"
                className="flex items-center justify-center size-7 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-transparent transition-colors"
                title="Settings"
              >
                <Settings className="size-3.5" />
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex items-center justify-center size-7 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-transparent transition-colors"
                title="Log out"
              >
                <LogOut className="size-3.5" />
              </button>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
