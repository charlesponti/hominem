/**
 * InboxStream
 *
 * Unified focus feed for the web — notes and chats interleaved, sorted by
 * updatedAt DESC. Web equivalent of mobile's InboxStream (FlashList-based).
 *
 * Responsibilities:
 *  - Loading skeleton (5 placeholder rows)
 *  - Empty state
 *  - GSAP stagger on first render and when items are prepended
 *  - Scroll-to-top when a new item joins the top of the list
 */

import gsap from 'gsap';
import { Sparkles } from 'lucide-react';
import { type RefObject, useEffect, useRef } from 'react';

import type { InboxStreamItem } from '~/hooks/use-inbox-stream';
import { InboxStreamCard } from './inbox-stream-card';

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function InboxStreamSkeleton() {
  return (
    <div className="overflow-hidden rounded-4xl border border-border/60 bg-background">
      <ul className="divide-y divide-border/50" aria-label="Loading feed" aria-busy>
        {Array.from({ length: 5 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: stable skeleton placeholder
          <li key={i} className="flex items-start gap-3 px-5 py-4">
            <div className="mt-0.5 size-7 shrink-0 animate-pulse rounded-full bg-bg-surface" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-bg-surface" />
              <div className="h-3 w-full animate-pulse rounded-full bg-bg-surface" />
              <div className="h-3 w-4/5 animate-pulse rounded-full bg-bg-surface" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function InboxStreamEmpty() {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-4xl border border-dashed border-border/70 bg-background px-6 py-12 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full border border-border/60 bg-bg-surface text-text-secondary">
        <Sparkles className="size-5" />
      </div>
      <h2 className="heading-3 text-foreground">Start with a thought</h2>
      <p className="body-2 mt-2 max-w-sm text-text-secondary">
        New notes and conversations will appear here together.
      </p>
    </div>
  );
}

// ─── InboxStream ──────────────────────────────────────────────────────────────

export interface InboxStreamProps {
  items: InboxStreamItem[];
  isLoading: boolean;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onDeleteNote?: (id: string) => void;
  onDeleteChat?: (id: string) => void;
}

export function InboxStream({
  items,
  isLoading,
  scrollRef,
  onDeleteNote,
  onDeleteChat,
}: InboxStreamProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const prevLengthRef = useRef(0);

  // Stagger-animate the top rows whenever items are added (initial load + new captures)
  useEffect(() => {
    if (!listRef.current || items.length === 0) return;

    const added = items.length - prevLengthRef.current;

    if (added > 0) {
      const rows = listRef.current.querySelectorAll<HTMLElement>(':scope > li:nth-child(-n + 5)');
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (reduced) {
        gsap.set(rows, { opacity: 1, y: 0 });
      } else {
        gsap.fromTo(
          rows,
          { opacity: 0, y: 12 },
          { opacity: 1, y: 0, duration: 0.2, ease: 'power2.out', stagger: 0.04, overwrite: 'auto' },
        );
      }

      // Scroll to top when items are prepended after initial load
      if (prevLengthRef.current > 0 && scrollRef?.current) {
        setTimeout(() => scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 60);
      }
    }

    prevLengthRef.current = items.length;
  }, [items.length, scrollRef]);

  if (isLoading) return <InboxStreamSkeleton />;
  if (items.length === 0) return <InboxStreamEmpty />;

  return (
    <div className="overflow-hidden rounded-4xl border border-border/60 bg-background">
      <ul ref={listRef} className="divide-y divide-border/50" aria-label="Focus feed">
        {items.map((item) => (
          <li key={`${item.kind}:${item.id}`} className="block">
            <InboxStreamCard
              item={item}
              {...(onDeleteNote ? { onDeleteNote } : {})}
              {...(onDeleteChat ? { onDeleteChat } : {})}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
