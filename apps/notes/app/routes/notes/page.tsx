import { useHonoQuery } from '@hominem/hono-client/react';
import type { ChatsListOutput } from '@hominem/hono-rpc/types/chat.types';
import type { Note } from '@hominem/hono-rpc/types/notes.types';
import { useEffect, useRef } from 'react';

import { useDeleteNote, useNotesList, useUpdateNote } from '~/hooks/use-notes';

import { NoteFeedItem } from './components/note-feed-item';
import { NotesBrowseScreen } from './components/notes-browse-screen';

export default function NotesPage() {
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const prevFeedLengthRef = useRef<number>(0);

  const { data: chats } = useHonoQuery<ChatsListOutput>(['chats', 'list'], ({ chats: c }) =>
    c.list({ limit: 6 }),
  );

  const {
    data: notes,
    isLoading,
    refetch,
  } = useNotesList({
    types: ['note'],
    sortBy: 'updatedAt',
    sortOrder: 'desc',
    limit: 100,
  });

  const allContentItems = (notes ?? []) as Note[];
  const recentSessions = chats ?? [];
  const updateItem = useUpdateNote();
  const deleteItem = useDeleteNote();

  useEffect(() => {
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!feedContainerRef.current) {
      prevFeedLengthRef.current = allContentItems.length;
      return;
    }
    if (allContentItems.length > prevFeedLengthRef.current) {
      setTimeout(() => {
        feedContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    }
    prevFeedLengthRef.current = allContentItems.length;
  }, [allContentItems.length]);

  function removeTagFromNote(noteId: string, tagValue: string) {
    const item = allContentItems.find((n) => n.id === noteId);
    if (!item) return;
    const newTags = (item.tags || []).filter((tag: { value: string }) => tag.value !== tagValue);
    updateItem.mutate({ id: noteId, tags: newTags });
  }

  function handleDeleteItem(id: string) {
    deleteItem.mutate({ id });
  }

  return (
    <NotesBrowseScreen
      eyebrow="Notes"
      title="Browse notes as one living stream instead of a pile of separate records."
      description="The notes view should feel like the same product as home: capture at the top, recent context nearby, and the rest of your writing in one calm chronology."
      scrollRef={feedContainerRef}
      sessions={recentSessions}
      notes={allContentItems}
      isLoading={isLoading}
      renderNote={(item) => (
        <li key={item.id} className="block">
          <NoteFeedItem
            note={item}
            onEdit={() => {}}
            onDelete={handleDeleteItem}
            onRemoveTag={removeTagFromNote}
          />
        </li>
      )}
    />
  );
}
