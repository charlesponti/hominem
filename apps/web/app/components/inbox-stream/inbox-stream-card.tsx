/**
 * InboxStreamCard
 *
 * Renders one item in the InboxStream feed. Discriminates on `item.kind`
 * to produce either a note row or a chat row.
 *
 * GSAP enter animation fires on mount; reduced-motion users get an
 * instant reveal (opacity: 1, y: 0 via gsap.set).
 *
 * Naming aligned with mobile: InboxStreamCard ↔ InboxStreamItem (RN)
 */

import gsap from 'gsap';
import { Clock3, FileText, MessageSquare, Trash2 } from 'lucide-react';
import { useEffect, useRef, type MouseEvent } from 'react';
import { Link } from 'react-router';

import { getTimeAgo } from '@hominem/utils';
import { Button } from '@hominem/ui/button';
import { Badge } from '@hominem/ui/components/ui/badge';

import type { InboxStreamItem } from '~/hooks/use-inbox-stream';
import { cn } from '~/lib/utils';

// ─── Animation helpers ────────────────────────────────────────────────────────

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function playEnter(el: HTMLElement) {
  if (reducedMotion()) {
    gsap.set(el, { opacity: 1, y: 0 });
  } else {
    gsap.fromTo(
      el,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out' },
    );
  }
}

// ─── Note row ─────────────────────────────────────────────────────────────────

function NoteRow({ item }: { item: Extract<InboxStreamItem, { kind: 'note' }> }) {
  const tags = item.note.tags?.slice(0, 4) ?? [];

  return (
    <Link
      to={`/notes/${item.id}`}
      className="group flex min-w-0 flex-1 flex-col gap-1.5 py-0.5"
      aria-label={`Open note: ${item.title}`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="heading-4 truncate text-foreground group-hover:underline">
          {item.title}
        </span>
        <span className="body-4 shrink-0 text-text-tertiary">{getTimeAgo(item.updatedAt)}</span>
      </div>

      {item.preview ? (
        <p className="body-2 line-clamp-2 text-text-secondary">{item.preview}</p>
      ) : null}

      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {tags.map((tag) => (
            <Badge
              key={tag.value}
              variant="secondary"
              className="rounded-full border border-border/60 bg-bg-surface px-2 py-0.5 body-4 text-text-tertiary"
            >
              #{tag.value}
            </Badge>
          ))}
        </div>
      ) : null}
    </Link>
  );
}

// ─── Chat row ─────────────────────────────────────────────────────────────────

function ChatRow({ item }: { item: Extract<InboxStreamItem, { kind: 'chat' }> }) {
  return (
    <Link
      to={`/chat/${item.id}`}
      className="group flex min-w-0 flex-1 items-center gap-3 py-0.5"
      aria-label={`Resume conversation: ${item.title}`}
    >
      <div className="min-w-0 flex-1">
        <div className="body-1 truncate text-foreground group-hover:underline">{item.title}</div>
        <div className="body-4 mt-0.5 flex items-center gap-1 text-text-tertiary">
          <Clock3 className="size-3" />
          {getTimeAgo(item.updatedAt)}
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 rounded-full px-3 opacity-0 transition-opacity group-hover:opacity-100"
        tabIndex={-1}
        aria-hidden
      >
        Resume
      </Button>
    </Link>
  );
}

// ─── Kind icon ────────────────────────────────────────────────────────────────

function KindIcon({ kind }: { kind: InboxStreamItem['kind'] }) {
  return (
    <div
      className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-bg-surface text-text-tertiary"
      aria-hidden
    >
      {kind === 'note' ? <FileText className="size-3.5" /> : <MessageSquare className="size-3.5" />}
    </div>
  );
}

// ─── InboxStreamCard ──────────────────────────────────────────────────────────

export interface InboxStreamCardProps {
  item: InboxStreamItem;
  onDeleteNote?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
  className?: string;
}

export function InboxStreamCard({
  item,
  onDeleteNote,
  onDeleteChat,
  className,
}: InboxStreamCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) playEnter(ref.current);
  }, []);

  function handleDelete(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (item.kind === 'note') onDeleteNote?.(item.id);
    else onDeleteChat?.(item.id);
  }

  const canDelete = item.kind === 'note' ? !!onDeleteNote : !!onDeleteChat;

  return (
    <div
      ref={ref}
      style={{ opacity: 0 }} // GSAP sets to 1 on mount
      className={cn('group flex items-start gap-3 px-5 py-4', className)}
    >
      <KindIcon kind={item.kind} />

      {item.kind === 'note' ? <NoteRow item={item} /> : <ChatRow item={item} />}

      {canDelete ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleDelete}
          className="mt-0.5 shrink-0 rounded-full text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
          title={`Delete ${item.kind}`}
          aria-label={`Delete ${item.kind}`}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
