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
      className="block border-b border-border/30 px-4 py-4 transition-colors hover:bg-surface last:border-b-0"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="flex-1 truncate text-[15px] font-medium text-text-primary">
          {item.title || (isNote ? 'Untitled note' : 'Untitled chat')}
        </span>
        <span className="shrink-0 text-xs text-text-tertiary">
          {formatTimestamp(item.updatedAt)}
        </span>
      </div>
      {item.preview ? (
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-text-secondary">
          {item.preview}
        </p>
      ) : null}
      <div className="mt-2">
        <span
          className={[
            'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-wide uppercase',
            isNote ? 'bg-surface text-text-tertiary' : 'bg-surface text-text-secondary',
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
        <div key={i} className="border-b border-border/30 px-4 py-4 last:border-b-0">
          <div className="flex items-baseline justify-between gap-3">
            <div
              className="h-3.5 rounded-md bg-surface"
              style={{ width: `${45 + (i % 3) * 15}%` }}
            />
            <div className="h-2.5 w-12 rounded-md bg-surface" />
          </div>
          <div
            className="mt-2 h-2.5 rounded-md bg-surface"
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
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-24 text-center">
      <p className="text-base font-semibold text-text-primary">Start with a thought</p>
      <p className="max-w-[32ch] text-[13px] text-text-secondary">
        New notes and conversations will appear here together.
      </p>
    </div>
  );
}

// ─── Stream container ──────────────────────────────────────────────────────────

export function FocusView() {
  const { items, isLoading } = useInboxStream();

  return (
    <div className="py-6">
      {isLoading ? (
        <FocusSkeleton />
      ) : items.length === 0 ? (
        <FocusEmpty />
      ) : (
        <ul className="divide-y divide-border/30">
          {items.map((item) => (
            <li key={`${item.kind}:${item.id}`} className="last:divide-y-0">
              <FocusRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
