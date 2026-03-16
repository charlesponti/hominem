import { useHonoQuery } from '@hominem/hono-client/react';
import type { ChatsListOutput } from '@hominem/hono-rpc/types/chat.types';
import type { Note } from '@hominem/hono-rpc/types/notes.types';
import { useEffect, useRef, useState } from 'react';

import { useDeleteNote, useNotesList, useUpdateNote } from '~/hooks/use-notes';

import type { Route } from './+types/home-view';
import { NoteFeedItem } from './notes/components/note-feed-item';
import { NotesBrowseScreen } from './notes/components/notes-browse-screen';

export async function loader({ request }: Route.LoaderArgs) {
  const { requireAuth } = await import('~/lib/guards');
  await requireAuth(request);
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 3;

export default function HomeView() {
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const prevFeedLengthRef = useRef<number>(0);
  const [, setItemToEdit] = useState<Note | null>(null);

  const { data: chats } = useHonoQuery<ChatsListOutput>(['chats', 'list'], ({ chats: c }) =>
    c.list({ limit: MAX_SESSIONS }),
  );

  const { data: notes = [], isLoading } = useNotesList({
    types: ['note'],
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    limit: 100,
  });

  const allNotes = notes as Note[];
  const updateItem = useUpdateNote();
  const deleteItem = useDeleteNote();

  const resumableSessions = (chats ?? []).filter((chat) => {
    const age = Date.now() - new Date(chat.updatedAt).getTime();
    return age <= THIRTY_DAYS_MS;
  });

  useEffect(() => {
    if (!feedContainerRef.current) {
      prevFeedLengthRef.current = allNotes.length;
      return;
    }
    if (allNotes.length > prevFeedLengthRef.current) {
      setTimeout(() => {
        feedContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
    prevFeedLengthRef.current = allNotes.length;
  }, [allNotes.length]);

  function removeTagFromNote(noteId: string, tagValue: string) {
    const item = allNotes.find((n) => n.id === noteId);
    if (!item) return;
    const newTags = (item.tags || []).filter((tag: { value: string }) => tag.value !== tagValue);
    updateItem.mutate({ id: noteId, tags: newTags });
  }

  function handleDeleteItem(id: string) {
    deleteItem.mutate({ id });
  }

  return (
    <NotesBrowseScreen
      eyebrow="Home"
      title="One place for raw thoughts, working notes, and live conversations."
      description="Capture quickly, resume a conversation without losing context, and let notes accumulate into one readable stream instead of separate tools."
      scrollRef={feedContainerRef}
      sessions={resumableSessions}
      notes={allNotes}
      isLoading={isLoading}
      renderNote={(note) => (
        <li key={note.id} className="block">
          <NoteFeedItem
            note={note}
            onEdit={(n) => setItemToEdit(n)}
            onDelete={handleDeleteItem}
            onRemoveTag={removeTagFromNote}
          />
        </li>
      )}
    />
  );
}
