import { useMemo, useState } from 'react';

import { EnhancedNoteItem } from '~/components/notes/enhanced-note-item';
import { useNotesList } from '~/hooks/use-notes';
import { InlineCreateForm } from '~/routes/notes/components/inline-create-form';

export function WorkspaceNotesPanel({ chatId, userId }: { chatId: string; userId?: string }) {
  const { data: notes, isLoading } = useNotesList({
    limit: 40,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
  const noteList = notes ?? [];
  const [query, setQuery] = useState('');

  const filteredNotes = useMemo(() => {
    if (!query) return noteList;
    const lower = query.toLowerCase();
    return noteList.filter((note) => {
      const haystack = `${note.title ?? ''} ${note.content ?? ''}`.toLowerCase();
      return haystack.includes(lower);
    });
  }, [noteList, query]);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold uppercase tracking-[0.4em] text-muted-foreground">
          Notes
        </h2>
        <input
          aria-label="Search notes"
          placeholder="Surface keywords"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="text-sm bg-background border border-border rounded px-3 py-1"
        />
      </div>

      <InlineCreateForm isVisible={true} />

      <div className="space-y-3">
        {isLoading && <p className="text-xs text-muted-foreground">Loading notes…</p>}
        {!isLoading && filteredNotes.length === 0 && (
          <p className="text-xs text-muted-foreground">No notes match that search yet.</p>
        )}
        {filteredNotes.map((note) => (
          <EnhancedNoteItem
            key={note.id}
            note={note}
            chatId={chatId}
            {...(userId ? { userId } : {})}
          />
        ))}
      </div>
    </section>
  );
}
