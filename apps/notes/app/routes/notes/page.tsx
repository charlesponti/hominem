import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Note } from '~/lib/trpc/notes-types';

import { useDeleteNote, useNotesList, useUpdateNote } from '~/hooks/use-notes';

import { InlineCreateForm } from './components/inline-create-form';
import { NoteFeedItem } from './components/note-feed-item';

export default function NotesPage() {
  const feedContainerRef = useRef<HTMLDivElement>(null);
  const prevFeedLengthRef = useRef<number>(0);

  // State for edit mode
  const [itemToEdit, setItemToEdit] = useState<Note | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');

  const {
    data: notesData,
    isLoading,
    refetch,
  } = useNotesList({
    types: ['note'], // Only show notes (thoughts)
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 100,
  });

  const allContentItems = (Array.isArray(notesData) ? notesData : []) as Note[];
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

  function handleEditItem(item: Note) {
    setItemToEdit(item);
    setFormMode('edit');
  }

  function removeTagFromNote(noteId: string, tagValue: string) {
    const item = allContentItems.find((n) => n.id === noteId);
    if (!item) {
      return;
    }

    const newTags = (item.tags || []).filter((tag: { value: string }) => tag.value !== tagValue);
    updateItem.mutate({
      id: noteId,
      tags: newTags,
    });
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

  return (
    <div className="flex flex-col h-screen w-full max-w-2xl mx-auto">
      {/* Fixed Header with Title */}
      <header className="shrink-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 z-10">
        <div className="py-4 px-4">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Home</h1>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-hidden">
        <div ref={feedContainerRef} className="h-full overflow-y-auto">
          <div className="px-4">
            {/* Always visible input form at the top */}
            <div className="py-4 border-b border-slate-200 dark:border-slate-700">
              <InlineCreateForm
                isVisible={true}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
                itemToEdit={itemToEdit}
                mode={formMode}
                defaultInputMode="note"
              />
            </div>

            {isLoading && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                <p className="text-slate-500 dark:text-slate-400">Loading your thoughts...</p>
              </div>
            )}

            {!isLoading && allContentItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 bg-linear-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-3xl flex items-center justify-center mb-6">
                  <Sparkles className="w-12 h-12 text-blue-500 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
                  Share your first thought
                </h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">
                  Start capturing your thoughts and ideas. Use the input above to share what's on
                  your mind.
                </p>
              </div>
            )}

            {allContentItems.length > 0 && (
              <div className="bg-white dark:bg-slate-900">
                {allContentItems.map((item: Note) => (
                  <NoteFeedItem
                    key={item.id}
                    note={item}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    onRemoveTag={removeTagFromNote}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
