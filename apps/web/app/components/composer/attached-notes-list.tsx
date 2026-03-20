import { X } from 'lucide-react'

import type { Note } from '@hominem/hono-rpc/types/notes.types'

export function AttachedNotesList({
  notes,
  onRemove,
}: {
  notes: Note[]
  onRemove: (id: string) => void
}) {
  if (notes.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {notes.map((note) => (
        <div
          key={note.id}
          className="flex items-center gap-1 rounded-md border border-border bg-bg-surface px-2 py-1"
        >
          <span className="max-w-[140px] truncate text-xs text-foreground">
            {note.title || 'Untitled note'}
          </span>
          <button
            type="button"
            onClick={() => onRemove(note.id)}
            aria-label={`Remove ${note.title ?? 'note'}`}
            className="text-text-tertiary transition-colors hover:text-foreground"
          >
            <X className="size-3" />
          </button>
        </div>
      ))}
    </div>
  )
}
