import { Button } from '@hominem/ui/button';
import { Badge } from '@hominem/ui/components/ui/badge';
import { useSendMessage } from '~/lib/hooks/use-send-message';
import type { Note } from '@hominem/hono-rpc/types/notes.types';
import { useMemo, useState } from 'react';

interface EnhancedNoteItemProps {
  note: Note;
  chatId: string;
  userId?: string;
  onDelete?: (id: string) => void;
  onRemoveTag?: (noteId: string, tag: string) => void;
}

const AI_PROMPTS = {
  expand: (note: Note) =>
    `Expand this note into a more structured version with actionable steps:\n${note.content}`,
  outline: (note: Note) => `Create an outline for this note so I can turn it into a plan:\n${note.content}`,
  rewrite: (note: Note) => `Rewrite this note with sharper language and clear intent:\n${note.content}`,
  summarize: (note: Note) => `Summarize this note into a 2-sentence takeaway:\n${note.content}`,
} as const;

type AIAction = keyof typeof AI_PROMPTS;

export function EnhancedNoteItem({
  note,
  chatId,
  userId,
  onDelete,
  onRemoveTag,
}: EnhancedNoteItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);

  const sendMessage = useSendMessage({ chatId, ...(userId && { userId }) });

  const titleOrPreview = useMemo(() => {
    if (note.title) return note.title;
    const preview = note.content?.split('\n')[0] ?? '';
    return preview.slice(0, 80);
  }, [note]);

  const formattedTags = useMemo(() => (note.tags ?? []).map((tag) => tag.value), [note.tags]);

  const handleAction = async (action: AIAction) => {
    setActiveAction(action);
    setIsSending(true);
    try {
      await sendMessage.mutateAsync?.({ message: AI_PROMPTS[action](note), chatId });
    } finally {
      setIsSending(false);
      setActiveAction(null);
    }
  };

  return (
    <article className="border border-border/60 p-4 rounded-lg bg-card">
      <header className="flex items-start justify-between gap-3">
        <div>
          <button
            type="button"
            className="text-xs text-muted-foreground tracking-[0.4em]"
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded ? 'FILTER ▲' : 'FILTER ▼'}
          </button>
          <h3 className="text-base font-semibold text-foreground mt-2">{titleOrPreview}</h3>
          <p className="text-xs text-muted-foreground">{new Date(note.updatedAt).toLocaleString()}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {note.versionNumber && note.versionNumber > 1 ? (
            <Badge variant="secondary" className="text-[0.55rem] uppercase">
              v{note.versionNumber}
            </Badge>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(note.id)}
            className="text-muted-foreground"
          >
            Delete
          </Button>
        </div>
      </header>

      {isExpanded && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{note.content}</p>
          <div className="flex flex-wrap gap-2">
            {formattedTags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="flex items-center gap-1 text-[0.6rem] uppercase"
              >
                {tag}
                {onRemoveTag && (
                  <button
                    type="button"
                    onClick={() => onRemoveTag(note.id, tag)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                )}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {(['expand', 'outline', 'rewrite', 'summarize'] as AIAction[]).map((action) => (
              <Button
                key={action}
                size="sm"
                variant="outline"
                onClick={() => handleAction(action)}
                disabled={isSending}
                className={action === activeAction ? 'text-primary' : ''}
              >
                {action.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
