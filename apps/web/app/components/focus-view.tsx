import { memo } from 'react';
import { Link } from 'react-router';

import { useInboxStream, type InboxStreamItem } from '~/hooks/use-inbox-stream';

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
      className="group block px-5 py-4 transition-colors hover:bg-(--color-emphasis-faint)"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="subheading-3 flex-1 truncate text-text-primary">
          {item.title || (isNote ? 'Untitled note' : 'Untitled chat')}
        </span>
        <span className="body-4 shrink-0 text-text-tertiary/70">
          {formatTimestamp(item.updatedAt)}
        </span>
      </div>
      {item.preview ? (
        <p className="body-3 mt-1 line-clamp-2 text-text-secondary/80">{item.preview}</p>
      ) : null}
      <div className="mt-2">
        <span
          className={[
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase',
            isNote
              ? 'bg-(--color-emphasis-faint) text-text-tertiary'
              : 'bg-primary/8 text-primary/70',
          ].join(' ')}
        >
          {isNote ? 'Note' : 'Chat'}
        </span>
      </div>
    </Link>
  );
});

// ─── Skeleton rows ─────────────────────────────────────────────────────────────

function FocusSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="px-5 py-4">
          <div className="flex items-baseline justify-between gap-3">
            <div
              className="h-3.5 rounded bg-(--color-emphasis-faint)"
              style={{ width: `${45 + (i % 3) * 15}%` }}
            />
            <div className="h-2.5 w-12 rounded bg-(--color-emphasis-faint)" />
          </div>
          <div
            className="mt-2 h-2.5 rounded bg-(--color-emphasis-faint)"
            style={{ width: `${60 + (i % 4) * 8}%` }}
          />
        </div>
      ))}
    </>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function FocusEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center">
      <p className="heading-4 text-text-primary">Start with a thought</p>
      <p className="body-3 max-w-[32ch] text-text-secondary">
        New notes and conversations will appear here together.
      </p>
    </div>
  );
}

// ─── Stream container ──────────────────────────────────────────────────────────

export function FocusView() {
  const { items, isLoading } = useInboxStream();

  return (
    <div
      className="overflow-y-auto"
      style={{
        height: 'calc(100dvh - var(--header-height, 56px) - var(--composer-resting-height, 112px))',
      }}
    >
      {isLoading ? (
        <FocusSkeleton />
      ) : items.length === 0 ? (
        <FocusEmpty />
      ) : (
        <ul className="divide-y divide-border/30">
          {items.map((item) => (
            <li key={`${item.kind}:${item.id}`}>
              <FocusRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
