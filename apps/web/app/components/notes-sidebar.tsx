/**
 * NotesSidebar
 *
 * The sidebar is a single chronological focus navigator — notes and chats
 * interleaved, sorted by updatedAt DESC. Filter pills (All | Notes | Chats)
 * provide client-side scoping without a re-fetch.
 *
 * Phase 3 — Sidebar as focus navigator.
 */

import { useAuthContext } from '@hominem/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@hominem/ui/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  useSidebar,
} from '@hominem/ui/components/ui/sidebar';
import gsap from 'gsap';
import {
  LogOut,
  MoreHorizontal,
  PenSquare,
  FileText,
  MessageSquare,
  Search,
  Settings,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';

import { useDeleteChat } from '~/hooks/use-chats';
import { useInboxStream, type InboxStreamItem } from '~/hooks/use-inbox-stream';
import { useDeleteNote } from '~/hooks/use-notes';
import { WEB_BRAND } from '~/lib/brand';
import { cn } from '~/lib/utils';

// ─── Filter ───────────────────────────────────────────────────────────────────

type FilterKind = 'all' | 'note' | 'chat';

const FILTER_LABELS: Record<FilterKind, string> = {
  all: 'All',
  note: 'Notes',
  chat: 'Chats',
};

// ─── SidebarFocusItem ─────────────────────────────────────────────────────────

function SidebarFocusItem({
  item,
  onDelete,
}: {
  item: InboxStreamItem;
  onDelete: (id: string) => void;
}) {
  const { pathname } = useLocation();
  const href = item.kind === 'note' ? `/notes/${item.id}` : `/chat/${item.id}`;
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <li className="group/item border-b border-sidebar-border/40 last:border-b-0">
      <div
        className={cn(
          'flex items-start gap-2 px-4 py-3 transition-colors duration-150',
          isActive
            ? 'bg-sidebar-accent/55'
            : 'hover:bg-sidebar-accent/30 focus-within:bg-sidebar-accent/30',
        )}
      >
        {item.kind === 'note' ? (
          <FileText className="mt-0.5 size-3.5 shrink-0 opacity-40" aria-hidden />
        ) : (
          <MessageSquare className="mt-0.5 size-3.5 shrink-0 opacity-40" aria-hidden />
        )}
        <Link
          to={href}
          prefetch="intent"
          className={cn(
            'min-w-0 flex-1 transition-colors duration-150',
            isActive
              ? 'text-sidebar-foreground'
              : 'text-sidebar-foreground/70 hover:text-sidebar-foreground',
          )}
        >
          <div className="truncate text-sm font-medium">{item.title || 'Untitled'}</div>
          <div className="truncate text-xs text-sidebar-foreground/50">
            {formatTimestamp(item.updatedAt)}
          </div>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/0 transition-colors duration-150 group-hover/item:text-sidebar-foreground/35 hover:text-sidebar-foreground"
              aria-label={`Options for ${item.title}`}
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(item.id)}
            >
              <Trash2 className="size-3.5" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

function formatTimestamp(value: string): string {
  const date = new Date(value);

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// ─── UserAvatar ───────────────────────────────────────────────────────────────

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
    <div className="flex size-8 items-center justify-center rounded-full border border-border/60 bg-bg-surface text-xs font-semibold text-foreground select-none">
      {initials}
    </div>
  );
}

// ─── NotesSidebar ─────────────────────────────────────────────────────────────

export default function NotesSidebar() {
  const auth = useAuthContext();
  const navigate = useNavigate();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const [filter, setFilter] = useState<FilterKind>('all');
  const [query, setQuery] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const prevLengthRef = useRef(0);

  const deleteNote = useDeleteNote();
  const deleteChat = useDeleteChat();
  const { items, isLoading } = useInboxStream();

  // Client-side filter + search
  const visible = useMemo(() => {
    let result = filter === 'all' ? items : items.filter((i) => i.kind === filter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((i) => i.title.toLowerCase().includes(q));
    }
    return result;
  }, [items, filter, query]);

  // GSAP stagger when new items arrive
  useEffect(() => {
    if (!listRef.current || visible.length === 0) return;
    const added = visible.length - prevLengthRef.current;
    if (added > 0) {
      const rows = listRef.current.querySelectorAll<HTMLElement>(':scope > li:nth-child(-n + 5)');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) {
        gsap.set(rows, { opacity: 1 });
      } else {
        gsap.fromTo(
          rows,
          { opacity: 0, x: -6 },
          {
            opacity: 1,
            x: 0,
            duration: 0.15,
            ease: 'power2.out',
            stagger: 0.03,
            overwrite: 'auto',
          },
        );
      }
    }
    prevLengthRef.current = visible.length;
  }, [visible.length]);

  const handleLogout = useCallback(async () => {
    await auth.logout?.();
    navigate('/');
  }, [auth, navigate]);

  function handleDelete(item: InboxStreamItem) {
    if (item.kind === 'note') deleteNote.mutate({ id: item.id });
    else deleteChat.mutate({ chatId: item.id });
  }

  const displayName = auth.user?.name ?? auth.user?.email ?? undefined;
  const email = auth.user?.email ?? undefined;

  return (
    <Sidebar collapsible="offcanvas" className="border-r-0">
      {/* Header */}
      <SidebarHeader className="px-3 pb-1 pt-3">
        <div className="flex h-10 items-center justify-between gap-2">
          {!isCollapsed && (
            <Link
              to="/home"
              prefetch="intent"
              className="group flex min-w-0 items-center gap-2"
              aria-label={`${WEB_BRAND.appName} home`}
            >
              <img
                src={WEB_BRAND.logoPath}
                alt={WEB_BRAND.appName}
                className="size-6 shrink-0 rounded-md object-cover"
              />
              <span className="truncate text-sm font-semibold text-sidebar-foreground transition-opacity group-hover:opacity-80">
                {WEB_BRAND.appName}
              </span>
            </Link>
          )}
          <div className="ml-auto flex shrink-0 items-center gap-0.5">
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => navigate('/chat/new')}
                className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
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
        {!isCollapsed && (
          <>
            {/* Search */}
            <SidebarGroup className="px-0 py-1">
              <SidebarGroupContent>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-sidebar-foreground/40" />
                  <SidebarInput
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search"
                    className="h-9 border-0 bg-transparent pl-8 text-sm text-sidebar-foreground placeholder:text-sidebar-foreground/40 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Filter pills */}
            <SidebarGroup className="px-0 py-0.5">
              <SidebarGroupContent>
                <div className="flex gap-1 px-1">
                  {(['all', 'note', 'chat'] as FilterKind[]).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setFilter(f)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium transition-colors duration-150',
                        filter === f
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                          : 'text-sidebar-foreground/50 hover:text-sidebar-foreground',
                      )}
                    >
                      {FILTER_LABELS[f]}
                    </button>
                  ))}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>

            {/* Unified focus list */}
            <SidebarGroup className="min-h-0 flex-1 px-0 py-1">
              <SidebarGroupContent className="min-h-0 flex-1">
                {isLoading ? (
                  <div className="space-y-1 px-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      // biome-ignore lint/suspicious/noArrayIndexKey: stable skeleton
                      <div
                        key={i}
                        className="h-12 animate-pulse rounded-3xl bg-sidebar-accent/30"
                      />
                    ))}
                  </div>
                ) : visible.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-sidebar-foreground/40">Nothing here yet</p>
                ) : (
                  <div className="rounded-[28px] bg-white/90 shadow-[0_12px_30px_rgba(15,23,42,0.06)] overflow-hidden">
                    <ul ref={listRef}>
                      {visible.map((item) => (
                        <SidebarFocusItem
                          key={`${item.kind}:${item.id}`}
                          item={item}
                          onDelete={() => handleDelete(item)}
                        />
                      ))}
                    </ul>
                  </div>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-sidebar-border/40 px-3 pb-3 pt-1">
        <div className="group flex items-center gap-2 py-1">
          <UserAvatar {...(displayName !== undefined ? { displayName } : {})} />
          {!isCollapsed && (
            <>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-sidebar-foreground">
                  {displayName ?? 'Account'}
                </div>
                {email && (
                  <div className="truncate text-xs text-sidebar-foreground/50">{email}</div>
                )}
              </div>
              <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <Link
                  to="/account"
                  prefetch="intent"
                  className="flex size-7 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
                  title="Settings"
                >
                  <Settings className="size-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex size-7 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
                  title="Log out"
                >
                  <LogOut className="size-3.5" />
                </button>
              </div>
            </>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
