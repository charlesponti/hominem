import { Link, useNavigate, useSearchParams, data } from 'react-router';

import { Button } from '~/components/button';
import { useCreateChat } from '~/hooks/use-chats';
import { serverEnv } from '~/lib/env.server';

type ChatListItem = { id: string; title: string | null; updatedAt: string };
type NoteSummary = { id: string; title?: string | null } | null;

export async function loader({ request }: { request: Request }) {
  const cookie = request.headers.get('cookie');
  const headers = cookie ? { cookie } : undefined;

  const chatsResponse = await fetch(
    new URL('/api/chats?limit=100', serverEnv.HOMINEM_INTERNAL_API_URL).toString(),
    { headers },
  );
  const chats = chatsResponse.ok ? ((await chatsResponse.json()) as ChatListItem[]) : [];

  const noteId = new URL(request.url).searchParams.get('noteId') ?? '';
  let note: NoteSummary = null;
  if (noteId) {
    const noteResponse = await fetch(
      new URL(`/api/notes/${noteId}`, serverEnv.HOMINEM_INTERNAL_API_URL).toString(),
      { headers },
    );
    note = noteResponse.ok ? ((await noteResponse.json()) as NoteSummary) : null;
  }

  return data({ chats, note });
}

export default function ChatIndexPage({
  loaderData,
}: {
  loaderData: { chats: ChatListItem[]; note: NoteSummary };
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const noteId = searchParams.get('noteId') ?? '';
  const { chats = [], note } = loaderData;
  const createChat = useCreateChat();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Chat</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Start a new conversation and pull in notes explicitly with mentions.
          </p>
        </div>
        <Button
          type="button"
          onClick={async () => {
            const chat = await createChat.mutateAsync({
              title: note?.title || 'New chat',
            });
            navigate(`/chat/${chat.id}${noteId ? `?noteId=${noteId}` : ''}`);
          }}
        >
          New chat
        </Button>
      </div>

      {note ? (
        <div className="rounded-2xl border border-border-subtle bg-surface p-4">
          <p className="text-sm text-text-secondary">
            This chat can start with note context from{' '}
            <span className="font-medium text-foreground">{note.title || 'Untitled note'}</span>.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3">
        {chats.map((chat) => (
          <Link
            key={chat.id}
            to={`/chat/${chat.id}`}
            className="rounded-2xl border border-border-subtle bg-surface p-4 transition hover:border-foreground/30"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-foreground">{chat.title}</h3>
                <p className="mt-1 text-sm text-text-secondary">
                  Updated {new Date(chat.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {chats.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border-subtle bg-surface p-10 text-center">
          <p className="text-base text-foreground">No chats yet.</p>
          <p className="mt-2 text-sm text-text-secondary">
            Create one and mention a note with <code>#note-title</code>.
          </p>
        </div>
      ) : null}
    </div>
  );
}
