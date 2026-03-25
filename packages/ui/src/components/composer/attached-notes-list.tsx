/**
 * AttachedNotesList
 *
 * Subscribes directly to the store's attachedNotes slice.
 * Only re-renders when the attached notes change — not on draft keystrokes.
 * Dispatches DETACH_NOTE directly without callback props.
 */

import { X } from 'lucide-react';
import { memo } from 'react';

import { useComposerSlice, useComposerStore } from './composer-provider';

export const AttachedNotesList = memo(function AttachedNotesList() {
  const store = useComposerStore();
  const attachedNotes = useComposerSlice((s) => s.attachedNotes);

  if (attachedNotes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {attachedNotes.map((note) => (
        <div
          key={note.id}
          className="flex items-center gap-1 rounded-md border border-border bg-bg-surface px-2 py-1"
        >
          <span className="max-w-35 truncate text-xs text-foreground">
            {note.title || 'Untitled note'}
          </span>
          <button
            type="button"
            onClick={() => store.dispatch({ type: 'DETACH_NOTE', noteId: note.id })}
            aria-label={`Remove ${note.title ?? 'note'}`}
            className="text-text-tertiary transition-colors hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
});
