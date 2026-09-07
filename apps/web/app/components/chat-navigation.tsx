import { History, LoaderCircle, LucideMessageCirclePlus } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/dropdown-menu';
import { Button } from '~/components/ui/button';
import { useChatLastMessages, useChatsList, useCreateChat } from '~/hooks/use-chats';

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
  const navigate = useNavigate();
  const { data: chats = [], isPending } = useChatsList();
  const createChat = useCreateChat();
  const recentChats = chats.slice(0, 10);
  const lastMessageQueries = useChatLastMessages(recentChats.map((chat) => chat.id));

  function handleNewChat() {
    createChat.mutate(
      { title: 'New chat' },
      { onSuccess: (chat) => navigate(`/chat/${chat.id}`, { viewTransition: true }) },
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        aria-label="Start a new chat"
        disabled={createChat.isPending}
        onClick={handleNewChat}
        size="sm"
        className="gap-2"
      >
        {createChat.isPending ? (
          <LoaderCircle className="animate-spin" />
        ) : (
          <LucideMessageCirclePlus />
        )}
      </Button>

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
