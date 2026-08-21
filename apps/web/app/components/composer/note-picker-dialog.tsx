/**
 * NotePickerDialog
 *
 * Floating panel that rises from the composer bar instead of a viewport-bottom sheet.
 * Open/close: caller calls notePickerDialogRef.current.showModal() / .close().
 * Animation: CSS @starting-style scale-up from composer — zero JS.
 * State: only a local search query string.
 */

import type { Note } from '@hominem/rpc/types/notes.types';
import { getTimeAgo } from '@hominem/utils';
import { Check, FileText, Search, X } from 'lucide-react';
import { forwardRef, memo, useMemo, useState } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
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
        className={cn(
          'note-picker-panel',
          'fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+80px)] top-auto',
          'm-0 mx-auto w-[calc(100%-1rem)] max-w-191',
          'max-h-[min(420px,50dvh)] flex-col',
          'rounded-2xl border border-border/40 bg-background p-0',
          'open:flex',
          'backdrop:bg-transparent',
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/30 px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Attach notes</h2>
          {attachedNotes.length > 0 && (
            <span className="rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">
              {attachedNotes.length}
            </span>
          )}
          <button
            type="button"
            onClick={close}
            className="ml-auto flex size-7 items-center justify-center rounded-full text-text-tertiary transition-colors hover:bg-surface hover:text-foreground"
            aria-label="Close note picker"
          >
            <X className="size-3.5" />
          </button>
        </div>

        <div className="shrink-0 px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
            <Search className="size-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
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

        <ul
          className="flex-1 overflow-y-auto overscroll-contain px-1.5 pb-1.5"
          role="listbox"
          aria-label="Notes"
          aria-multiselectable="true"
        >
          {filtered.length === 0 ? (
            <li className="flex items-center justify-center py-8 text-sm text-text-tertiary">
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
                      'flex w-full items-center gap-3 rounded-lg py-2.5 text-left transition-colors hover:bg-surface',
                      isSelected && 'bg-surface',
                    )}
                  >
                    <div
                      className={cn(
                        'flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors',
                        isSelected
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border/60 text-text-tertiary',
                      )}
                      aria-hidden="true"
                    >
                      {isSelected ? <Check className="size-3" /> : <FileText className="size-3" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-foreground">
                        {note.title || 'Untitled note'}
                      </div>
                      {note.excerpt && (
                        <div className="mt-0.5 line-clamp-1 text-xs text-text-tertiary">
                          {note.excerpt}
                        </div>
                      )}
                    </div>
                    <span className="shrink-0 text-[11px] text-text-tertiary">
                      {getTimeAgo(note.updatedAt)}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {attachedNotes.length > 0 && (
          <div className="shrink-0 border-t border-border/30 px-3 py-2">
            <Button
              type="button"
              size="sm"
              className="w-full rounded-lg text-[13px]"
              onClick={close}
            >
              Attach {attachedNotes.length} note{attachedNotes.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}
      </dialog>
    );
  }),
);
