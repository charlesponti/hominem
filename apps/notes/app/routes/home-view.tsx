'use client';

import { useHonoQuery } from '@hominem/hono-client/react';
import type { ChatsListOutput } from '@hominem/hono-rpc/types/chat.types';
import type { Note } from '@hominem/hono-rpc/types/notes.types';
import { Stack } from '@hominem/ui';
import { MessageSquare, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { useDeleteNote, useNotesList, useUpdateNote } from '~/hooks/use-notes';

import type { Route } from './+types/home-view';
import { InlineCreateForm } from './notes/components/inline-create-form';
import { NoteFeedItem } from './notes/components/note-feed-item';

export async function loader({ request }: Route.LoaderArgs) {
  const { requireAuth } = await import('~/lib/guards');
  await requireAuth(request);
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_SESSIONS = 3;

export default function HomeView() {
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const prevFeedLengthRef = useRef<number>(0);

  const [itemToEdit, setItemToEdit] = useState<Note | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const { data: chats } = useHonoQuery<ChatsListOutput>(['chats', 'list'], ({ chats: c }) =>
    c.list({ limit: MAX_SESSIONS }),
  );

  const {
    data: notes = [],
    isLoading,
    refetch,
  } = useNotesList({
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

  const hasAnything = resumableSessions.length > 0 || allNotes.length > 0;

  useEffect(() => {
    refetch();
  }, [refetch]);

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

  function handleEditItem(item: Note) {
    setItemToEdit(item);
    setFormMode('edit');
  }

  function removeTagFromNote(noteId: string, tagValue: string) {
    const item = allNotes.find((n) => n.id === noteId);
    if (!item) return;

    const newTags = (item.tags || []).filter((tag: { value: string }) => tag.value !== tagValue);
    updateItem.mutate({ id: noteId, tags: newTags });
  }

  function handleDeleteItem(id: string) {
    deleteItem.mutate({ id });
  }

  function handleFormSuccess() {
    setItemToEdit(null);
    setFormMode('create');
  }

  function handleFormCancel() {
    setItemToEdit(null);
    setFormMode('create');
  }

  function handleExpand(note: Note) {
    console.log('Expand note:', note.id);
  }

  function handleOutline(note: Note) {
    console.log('Outline note:', note.id);
  }

  function handleRewrite(note: Note) {
    console.log('Rewrite note:', note.id);
  }

  if (!hasAnything && !isLoading) {
    return (
      <div className="flex flex-col h-screen w-full">
        <header className="shrink-0 border-b border-border z-10">
          <div className="py-4 px-4">
            <h1 className="heading-3 text-foreground">Home</h1>
          </div>
        </header>
        <main className="flex-1 overflow-hidden">
          <div ref={feedContainerRef} className="h-full overflow-y-auto">
            <div className="px-4 py-4 space-y-4">
              <div className="border border-border p-4">
                <InlineCreateForm
                  isVisible={formMode === 'create'}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                  itemToEdit={itemToEdit}
                  mode={formMode}
                />
              </div>
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 border border-dashed border-border flex items-center justify-center mb-6">
                  <Sparkles className="w-12 h-12 text-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No notes yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Start capturing your thoughts and ideas. Use the input above to create your first
                  note.
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-full">
      <header className="shrink-0 border-b border-border z-10">
        <div className="py-4 px-4">
          <h1 className="heading-3 text-foreground">Home</h1>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div ref={feedContainerRef} className="h-full overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            {resumableSessions.length > 0 && (
              <section aria-labelledby="sessions-heading">
                <h2
                  id="sessions-heading"
                  className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3"
                >
                  Sessions
                </h2>
                <Stack as="ul" gap="sm">
                  {resumableSessions.map((chat) => (
                    <li key={chat.id}>
                      <Link
                        to={`/chat/${chat.id}`}
                        className="flex items-center gap-3 px-3 py-2.5 border border-border rounded hover:bg-muted transition-colors group"
                      >
                        <MessageSquare className="size-3.5 text-muted-foreground shrink-0" />
                        <span className="flex-1 text-sm text-foreground truncate">
                          {chat.title || 'Untitled session'}
                        </span>
                        <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                          Resume →
                        </span>
                      </Link>
                    </li>
                  ))}
                </Stack>
              </section>
            )}

            <section aria-labelledby="notes-heading">
              <h2
                id="notes-heading"
                className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3"
              >
                Notes
              </h2>

              <div className="border border-border p-4">
                <InlineCreateForm
                  isVisible={formMode === 'create'}
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                  itemToEdit={itemToEdit}
                  mode={formMode}
                />
              </div>

              {formMode === 'edit' && itemToEdit && (
                <div className="border border-border p-4 mt-4">
                  <InlineCreateForm
                    isVisible={true}
                    onSuccess={handleFormSuccess}
                    onCancel={handleFormCancel}
                    itemToEdit={itemToEdit}
                    mode="edit"
                  />
                </div>
              )}

              {isLoading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-primary/30 border-t-primary mb-4" />
                  <p className="text-muted-foreground">Loading notes...</p>
                </div>
              )}

              {!isLoading && allNotes.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-24 h-24 border border-dashed border-border flex items-center justify-center mb-6">
                    <Sparkles className="w-12 h-12 text-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">No notes yet</h3>
                  <p className="text-muted-foreground max-w-md">
                    Start capturing your thoughts and ideas. Use the input above to create your
                    first note.
                  </p>
                </div>
              )}

              {allNotes.length > 0 && (
                <div className="border border-border overflow-hidden mt-4">
                  {allNotes.map((note: Note) => (
                    <NoteFeedItem
                      key={note.id}
                      note={note}
                      onEdit={handleEditItem}
                      onDelete={handleDeleteItem}
                      onRemoveTag={removeTagFromNote}
                      onExpand={handleExpand}
                      onOutline={handleOutline}
                      onRewrite={handleRewrite}
                    />
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
