import { notesTokens } from '@hominem/ui/tokens';
import { memo, useEffect, useRef } from 'react';
import { Link } from 'react-router';

import { useInboxStream, type InboxStreamItem } from '~/hooks/use-inbox-stream';

// ─── Time-of-day greeting ─────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 6) return 'Late night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Late night';
}

// ─── Timestamp ────────────────────────────────────────────────────────────────

function formatTimestamp(value: string): string {
  const date = new Date(value);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (dayDiff === 0) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (dayDiff === 1) return 'Yesterday';
  if (dayDiff < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Row ──────────────────────────────────────────────────────────────────────

const FocusRow = memo(function FocusRow({ item }: { item: InboxStreamItem }) {
  const href = item.kind === 'note' ? `/notes/${item.id}` : `/chat/${item.id}`;
  const isNote = item.kind === 'note';

  return (
    <Link
      to={href}
      prefetch="intent"
      className="group block transition-all duration-200 hover:bg-[var(--color-bg-surface)] hover:shadow-[var(--shadow-low)] active:scale-[0.995]"
      style={{
        borderRadius: notesTokens.stream.itemRadius,
        paddingInline: notesTokens.stream.itemPaddingX,
        paddingBlock: notesTokens.stream.itemPaddingY,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <span
              className={[
                'inline-flex shrink-0 rounded-full transition-transform group-hover:scale-125',
                isNote ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-text-tertiary)]',
              ].join(' ')}
              style={{
                width: notesTokens.stream.typeIconSize,
                height: notesTokens.stream.typeIconSize,
                opacity: isNote ? 1 : notesTokens.states.chatIndicatorOpacity,
              }}
            />
            <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
              {item.title || (isNote ? 'Untitled note' : 'Untitled chat')}
            </span>
          </div>
          {item.preview ? (
            <p
              className="mt-1.5 line-clamp-2 text-[13px] leading-[1.65] text-[var(--color-text-secondary)]"
              style={{
                paddingLeft: notesTokens.stream.dividerInset,
                opacity: notesTokens.states.previewOpacity,
              }}
            >
              {item.preview}
            </p>
          ) : null}
        </div>
        <span
          className="mt-1 shrink-0 text-[11px] font-medium tabular-nums text-[var(--color-text-tertiary)]"
          style={{ opacity: notesTokens.states.metadataOpacity }}
        >
          {formatTimestamp(item.updatedAt)}
        </span>
      </div>
    </Link>
  );
});

// ─── Skeleton rows ─────────────────────────────────────────────────────────────

function FocusSkeleton() {
  return (
    <div className="space-y-1 void-anim-stagger-list">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-2xl px-4 py-3.5 void-anim-shimmer-sweep">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <div className="size-2 rounded-full bg-[var(--color-emphasis-faint)]" />
                <div
                  className="h-3.5 rounded-full bg-[var(--color-emphasis-faint)]"
                  style={{ width: `${35 + (i % 3) * 20}%` }}
                />
              </div>
              <div
                className="mt-2.5 ml-[18px] h-3 rounded-full bg-[var(--color-emphasis-faint)]"
                style={{ width: `${50 + (i % 4) * 12}%` }}
              />
            </div>
            <div className="mt-1 h-2.5 w-10 rounded-full bg-[var(--color-emphasis-faint)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function FocusEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-6 py-32 text-center void-anim-enter">
      <div className="relative flex items-center justify-center">
        <div className="absolute size-16 rounded-full bg-[var(--color-accent)]/8 void-anim-thinking" />
        <div className="relative flex size-12 items-center justify-center rounded-2xl bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-medium)]">
          <span className="text-lg">✦</span>
        </div>
      </div>
      <div>
        <p className="text-[17px] font-semibold tracking-[-0.01em] text-[var(--color-text-primary)]">
          Start with a thought
        </p>
        <p className="mt-1.5 max-w-[26ch] text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
          Notes and conversations appear here, sorted by recency.
        </p>
      </div>
    </div>
  );
}

// ─── Stream container ──────────────────────────────────────────────────────────

export function FocusView() {
  const { items, isLoading } = useInboxStream();
  const listRef = useRef<HTMLDivElement>(null);

  // Stagger-animate items on mount
  useEffect(() => {
    if (!isLoading && items.length > 0 && listRef.current) {
      listRef.current.classList.add('void-anim-stagger-list');
    }
  }, [isLoading, items.length]);

  return (
    <div className="py-4">
      {/* Ambient greeting */}
      {!isLoading && items.length > 0 && (
        <div className="mb-4 px-4 void-anim-enter">
          <p className="text-[13px] font-medium text-[var(--color-text-tertiary)]">
            {getGreeting()}
          </p>
        </div>
      )}

      {isLoading ? (
        <FocusSkeleton />
      ) : items.length === 0 ? (
        <FocusEmpty />
      ) : (
        <div ref={listRef} className="space-y-0.5">
          {items.map((item) => (
            <FocusRow key={`${item.kind}:${item.id}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
