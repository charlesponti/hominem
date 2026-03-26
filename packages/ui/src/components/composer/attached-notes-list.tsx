/**
 * AttachedNotesList
 *
 * Subscribes directly to the store's attachedNotes slice.
 * Only re-renders when the attached notes change — not on draft keystrokes.
 * Dispatches DETACH_NOTE directly without callback props.
 */

import { FileText, X } from 'lucide-react';
import { memo } from 'react';

import { useComposerSlice, useComposerStore } from './composer-provider';

export const AttachedNotesList = memo(function AttachedNotesList() {
  const store = useComposerStore();
  const attachedNotes = useComposerSlice((s) => s.attachedNotes);

  if (attachedNotes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {attachedNotes.map((note) => (
        <div key={note.id} className="flex items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1">
          <FileText className="size-3 shrink-0 text-text-tertiary" />
          <span className="max-w-32 truncate text-xs font-medium text-foreground">
            {note.title || 'Untitled note'}
          </span>
          <button
            type="button"
            onClick={() => store.dispatch({ type: 'DETACH_NOTE', noteId: note.id })}
            aria-label={`Remove ${note.title ?? 'note'}`}
            className="flex size-4 items-center justify-center rounded text-text-tertiary transition-colors hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
});
