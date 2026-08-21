import type { NoteFeedItem } from '@hominem/rpc/types/notes.types';
import { Paperclip } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router';

interface NoteStreamRowProps {
  note: NoteFeedItem;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((today.getTime() - targetDay.getTime()) / 86400000);

  if (dayDiff === 0) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  if (dayDiff === 1) {
    return 'Yesterday';
  }

  if (dayDiff > 1 && dayDiff < 7) {
    return date.toLocaleDateString([], { weekday: 'short' });
  }

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export const NoteStreamRow = memo(function NoteStreamRow({ note }: NoteStreamRowProps) {
  const title = note.title || 'Untitled note';
  const preview = note.contentPreview || 'No content yet.';
  const timestamp = formatTimestamp(note.createdAt);

  return (
    <div className="relative py-0 after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-border-subtle last:after:hidden">
      <Link
        to={`/notes/${note.id}`}
        className="group flex items-start gap-2 rounded-none px-4 py-3 outline-none transition-colors active:bg-elevated/40 focus-visible:[outline-style:solid] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
      >
        <div className="mt-px flex h-[18px] w-[18px] shrink-0 items-center justify-center text-text-secondary transition-colors group-active:text-foreground">
          <span className="h-[18px] w-[18px] rounded-sm border border-current" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="min-w-0 flex-1 truncate text-[15px] font-medium leading-5 tracking-[-0.2px] text-foreground group-active:font-medium">
              {title}
            </h2>
            <div className="shrink-0 text-right text-[11px] leading-3 text-text-tertiary">
              {timestamp}
            </div>
          </div>

          <div className="mt-1 min-w-0 text-[11px] leading-4 text-text-tertiary">
            <p className="line-clamp-2 text-text-secondary">{preview}</p>
            {note.metadata.hasAttachments ? (
              <div className="mt-1 inline-flex items-center gap-1">
                <Paperclip className="size-3" aria-hidden="true" />
                <span>Files</span>
              </div>
            ) : null}
          </div>
        </div>
      </Link>
    </div>
  );
});
