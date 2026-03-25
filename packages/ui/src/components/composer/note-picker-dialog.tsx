/**
 * NotePickerDialog
 *
 * Native <dialog> that replaces the GSAP-animated bottom sheet.
 * Open/close: caller calls notePickerDialogRef.current.showModal() / .close().
 * Animation: CSS @starting-style slide-up — zero JS, zero GSAP.
 * State: only a local search query string (useState is the right tool here).
 */

import type { Note } from '@hominem/rpc/types/notes.types';
import { getTimeAgo } from '@hominem/utils';
import { Check, FileText, Search, X } from 'lucide-react';
import { forwardRef, memo, useMemo, useState } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { useComposerSlice, useComposerStore } from './composer-provider';

interface NotePickerDialogProps {
  notes: Note[];
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const NotePickerDialog = memo(
  forwardRef<HTMLDialogElement, NotePickerDialogProps>(function NotePickerDialog(
    { notes, inputRef },
    ref,
  ) {
    const store = useComposerStore();
    const attachedNotes = useComposerSlice((s) => s.attachedNotes);

    // Local search state — not global, not in the store
    const [query, setQuery] = useState('');

    const filtered = useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return notes;
      return notes.filter(
        (n) =>
          n.title?.toLowerCase().includes(q) ||
          n.content?.toLowerCase().includes(q) ||
          n.excerpt?.toLowerCase().includes(q),
      );
    }, [notes, query]);

    function close() {
      if (ref && 'current' in ref) ref.current?.close();
    }

    function toggleNote(note: Note) {
      if (attachedNotes.some((n) => n.id === note.id)) {
        store.dispatch({ type: 'DETACH_NOTE', noteId: note.id });
      } else {
        store.dispatch({ type: 'ATTACH_NOTE', note });
      }
    }

    return (
      <dialog
        ref={ref}
        aria-label="Attach notes"
        onClose={() => {
          setQuery('');
          inputRef.current?.focus();
        }}
        // Positioned at viewport bottom via CSS; slides up on open via @starting-style
        className="note-picker-dialog fixed inset-x-0 bottom-0 top-auto m-0 max-h-[70dvh] w-full max-w-none flex-col rounded-t-3xl border-t border-border/60 bg-background p-0 shadow-xl open:flex backdrop:bg-black/30 backdrop:backdrop-blur-sm"
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-md bg-border/60" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 pb-3 pt-2">
          <h2 className="text-base font-semibold text-foreground">Attach notes</h2>
          {attachedNotes.length > 0 && (
            <span className="text-xs text-text-tertiary">{attachedNotes.length} selected</span>
          )}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={close}
            className="ml-auto rounded-full"
            aria-label="Close note picker"
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-bg-surface px-3 py-2">
            <Search className="size-4 shrink-0 text-text-tertiary" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search notes…"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-text-tertiary outline-none"
            />
          </div>
        </div>

        {/* Note list */}
        <ul
          className="flex-1 overflow-y-auto divide-y divide-border/50 px-1"
          role="listbox"
          aria-label="Notes"
          aria-multiselectable="true"
        >
          {filtered.length === 0 ? (
            <li className="flex items-center justify-center py-10 text-sm text-text-tertiary">
              No notes found
            </li>
          ) : (
            filtered.map((note) => {
              const isSelected = attachedNotes.some((n) => n.id === note.id);
              return (
                <li key={note.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    onClick={() => toggleNote(note)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-surface',
                      isSelected && 'bg-bg-surface',
                    )}
                  >
                    <div
                      className={cn(
                        'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                        isSelected
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border/60 bg-background text-text-tertiary',
                      )}
                      aria-hidden="true"
                    >
                      {isSelected ? (
                        <Check className="size-3.5" />
                      ) : (
                        <FileText className="size-3.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">
                        {note.title || 'Untitled note'}
                      </div>
                      {note.excerpt && (
                        <div className="mt-0.5 line-clamp-1 text-xs text-text-tertiary">
                          {note.excerpt}
                        </div>
                      )}
                      <div className="mt-0.5 text-xs text-text-tertiary">
                        {getTimeAgo(note.updatedAt)}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer */}
        <div className="border-t border-border/60 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <Button
            type="button"
            className="w-full rounded-md"
            onClick={close}
            disabled={attachedNotes.length === 0}
          >
            {attachedNotes.length > 0
              ? `Attach ${attachedNotes.length} note${attachedNotes.length > 1 ? 's' : ''}`
              : 'Select notes to attach'}
          </Button>
        </div>
      </dialog>
    );
  }),
);
