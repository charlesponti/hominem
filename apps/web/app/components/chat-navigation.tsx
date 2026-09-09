import { History } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import { ChatStartButton } from '~/components/chat/chat-start-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/dropdown-menu';
import { Button } from '~/components/ui/button';
import { useChatLastMessages, useChatsList } from '~/hooks/use-chats';

const chatDateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatLastMessageDate(date: string | undefined) {
  return date ? chatDateFormatter.format(new Date(date)) : 'No messages yet';
}

function getLastMessageLabel(query: { isPending: boolean; data?: Array<{ createdAt: string }> }) {
  return query.isPending ? 'Loading…' : formatLastMessageDate(query.data?.[0]?.createdAt);
}

export function ChatNavigation() {
  const location = useLocation();
  const { data: chats = [], isPending } = useChatsList();
  const recentChats = chats.slice(0, 10);
  const lastMessageQueries = useChatLastMessages(recentChats.map((chat) => chat.id));

  return (
    <div className="flex items-center gap-1">
      <ChatStartButton className="gap-2" size="sm" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Open previous chats" size="sm" variant="outline">
            <History />
            <span className="hidden sm:inline">Chats</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Previous chats</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isPending ? (
            <DropdownMenuItem disabled>Loading chats…</DropdownMenuItem>
          ) : chats.length === 0 ? (
            <DropdownMenuItem disabled>No previous chats</DropdownMenuItem>
          ) : (
            recentChats.map((chat, index) => (
              <DropdownMenuItem
                asChild
                className={location.pathname === `/chat/${chat.id}` ? 'bg-accent' : undefined}
                key={chat.id}
              >
                <Link className="min-w-0" to={`/chat/${chat.id}`} viewTransition>
                  <span className="min-w-0 flex-1 truncate">{chat.title || 'Untitled chat'}</span>
                  <time
                    className="shrink-0 text-xs text-muted-foreground"
                    dateTime={lastMessageQueries[index]?.data?.[0]?.createdAt}
                  >
                    {getLastMessageLabel(lastMessageQueries[index] ?? { isPending: true })}
                  </time>
                </Link>
              </DropdownMenuItem>
            ))
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link to="/chats" viewTransition>
              View all chats
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
