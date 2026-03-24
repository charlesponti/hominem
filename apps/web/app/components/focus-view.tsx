import { FileText, MessageSquareText } from 'lucide-react';
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
  const Icon = item.kind === 'note' ? FileText : MessageSquareText;

  return (
    <Link
      to={href}
      prefetch="intent"
      className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-(--color-emphasis-faint)"
    >
      <span className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center">
        <Icon className="size-[11px] text-text-tertiary" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="subheading-4 truncate text-text-primary">{item.title}</span>
          <span className="body-4 shrink-0 text-text-tertiary opacity-60">
            {formatTimestamp(item.updatedAt)}
          </span>
        </div>
        {item.preview ? (
          <p className="body-3 mt-0.5 line-clamp-2 text-text-secondary opacity-75">
            {item.preview}
          </p>
        ) : null}
      </div>
    </Link>
  );
});

// ─── Skeleton rows ─────────────────────────────────────────────────────────────

function FocusSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <div className="mt-1 size-[18px] shrink-0 rounded bg-(--color-emphasis-faint)" />
          <div className="flex-1 space-y-2">
            <div
              className="h-3 rounded bg-(--color-emphasis-faint)"
              style={{ width: `${55 + (i % 3) * 15}%` }}
            />
            <div
              className="h-2.5 rounded bg-(--color-emphasis-faint)"
              style={{ width: `${35 + (i % 4) * 12}%` }}
            />
          </div>
        </div>
      ))}
    </>
  );
}

// ─── Empty state ───────────────────────────────────────────────────────────────

function FocusEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <p className="heading-4 text-text-primary">Start with a thought</p>
      <p className="body-3 max-w-[32ch] text-text-secondary">
        New notes and conversations will appear here together.
      </p>
    </div>
  );
}

// ─── Stream container ──────────────────────────────────────────────────────────
//
// Layout contract:
//   100dvh
//   ├── header   fixed, h-14 mobile / h-16 desktop  (main has mt-14 / md:mt-16)
//   ├── THIS container — fills the remaining space and scrolls internally
//   └── composer fixed, height = var(--composer-resting-height)
//
// Height = 100dvh − header − composer, expressed as a calc() on the container.
// Nothing can render behind either fixed element because the scroll region is
// physically bounded above and below.

export function FocusView() {
  const { items, isLoading } = useInboxStream();

  return (
    <div
      className="card overflow-y-auto"
      style={{
        height: 'calc(100dvh - var(--header-height, 56px) - var(--composer-resting-height, 112px))',
      }}
    >
      {isLoading ? (
        <FocusSkeleton />
      ) : items.length === 0 ? (
        <FocusEmpty />
      ) : (
        <ul>
          {items.map((item, i) => (
            <li
              key={`${item.kind}:${item.id}`}
              className={i < items.length - 1 ? 'border-b border-subtle' : undefined}
            >
              <FocusRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
