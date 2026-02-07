import { Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Note } from '~/lib/rpc/notes-types';

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
    types: ['note'],
    sortBy: 'updatedAt',
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

  // Development action handlers
  function handleExpand(note: Note) {
    console.log('Expand note:', note.id);
  }

  function handleOutline(note: Note) {
    console.log('Outline note:', note.id);
  }

  function handleRewrite(note: Note) {
    console.log('Rewrite note:', note.id);
  }

  return (
    <div className="flex flex-col h-screen w-full max-w-2xl mx-auto">
      {/* Fixed Header */}
      <header className="shrink-0 border-b border-border z-10">
        <div className="py-4 px-4">
          <h1 className="text-2xl font-bold text-foreground">Notes</h1>
        </div>
      </header>

      {/* Scrollable Main Content */}
      <main className="flex-1 overflow-hidden">
        <div ref={feedContainerRef} className="h-full overflow-y-auto">
          <div className="px-4 py-4 space-y-4">
            {/* Create form */}
            <div className="border border-border rounded-lg p-4">
              <InlineCreateForm
                isVisible={formMode === 'create'}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
                itemToEdit={itemToEdit}
                mode={formMode}
              />
            </div>

            {/* Edit form (shown when editing) */}
            {formMode === 'edit' && itemToEdit && (
              <div className="border border-border rounded-lg p-4">
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

            {!isLoading && allContentItems.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-24 h-24 border border-dashed border-border rounded-3xl flex items-center justify-center mb-6">
                  <Sparkles className="w-12 h-12 text-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No notes yet</h3>
                <p className="text-muted-foreground max-w-md">
                  Start capturing your thoughts and ideas. Use the input above to create your first
                  note.
                </p>
              </div>
            )}

            {allContentItems.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                {allContentItems.map((item: Note) => (
                  <NoteFeedItem
                    key={item.id}
                    note={item}
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
          </div>
        </div>
      </main>
    </div>
  );
}
