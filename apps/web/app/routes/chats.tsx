import { Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { ChatStartButton } from '~/components/chat/chat-start-button';
import { RouteHeader } from '~/components/route-header';
import { Button } from '~/components/ui/button';
import { useArchiveChat, useChatLastMessages, useChatsList } from '~/hooks/use-chats';

const PAGE_SIZE = 20;
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

export const meta = () => [{ title: 'Chats' }];

export default function ChatsPage() {
  const [page, setPage] = useState(0);
  const { data: chats = [], error, isPending } = useChatsList();
  const archiveChat = useArchiveChat({});
  const pageChats = chats.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const lastMessageQueries = useChatLastMessages(pageChats.map((chat) => chat.id));
  const pageCount = Math.max(1, Math.ceil(chats.length / PAGE_SIZE));

  return (
    <div className="h-full overflow-auto">
      <RouteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex justify-center">
          <picture>
            <source srcSet="/omiro-float.avif" type="image/avif" />
            <source srcSet="/omiro-float.webp" type="image/webp" />
            <img
              alt="Omiro floating on a cloud"
              className="omiro-float h-[100px] w-auto"
              decoding="async"
              fetchPriority="high"
              height="234"
              src="/omiro-float.png"
              width="256"
            />
          </picture>
        </div>
        <div className="mb-8 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Chats</h1>
          </div>
          <ChatStartButton className="gap-2" size="sm" />
        </div>

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          {isPending ? <p className="p-5 text-sm text-muted-foreground">Loading chats…</p> : null}
          {error ? <p className="p-5 text-sm text-destructive">Chats unavailable.</p> : null}
          {!isPending && !error && chats.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No chats yet.</p>
          ) : null}
          {!isPending && !error && pageChats.length > 0 ? (
            <div className="divide-y divide-border">
              {pageChats.map((chat, index) => (
                <div
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted"
                  key={chat.id}
                >
                  <Link className="min-w-0 flex-1" to={`/chat/${chat.id}`} viewTransition>
                    <span className="block truncate font-medium">
                      {chat.title || 'Untitled chat'}
                    </span>
                    <time
                      className="text-sm text-muted-foreground"
                      dateTime={lastMessageQueries[index]?.data?.[0]?.createdAt}
                    >
                      {getLastMessageLabel(lastMessageQueries[index] ?? { isPending: true })}
                    </time>
                  </Link>
                  <Button
                    aria-label={`Archive ${chat.title || 'chat'}`}
                    disabled={archiveChat.isPending}
                    onClick={() => archiveChat.mutate({ chatId: chat.id })}
                    size="icon-sm"
                    title="Archive chat"
                    variant="ghost"
                  >
                    <Archive aria-hidden="true" />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {chats.length > PAGE_SIZE ? (
          <nav aria-label="Chat pages" className="mt-5 flex items-center justify-between">
            <Button
              disabled={page === 0}
              onClick={() => setPage((current) => current - 1)}
              variant="outline"
            >
              <ChevronLeft /> Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page + 1} of {pageCount}
            </span>
            <Button
              disabled={page >= pageCount - 1}
              onClick={() => setPage((current) => current + 1)}
              variant="outline"
            >
              Next <ChevronRight />
            </Button>
          </nav>
        ) : null}
      </main>
    </div>
  );
}
