import { EmptyState } from '@ponti-studios/ui/feedback';
import { ChevronRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { cn } from '~/lib/utils';

interface CareerListRowProps {
  to: string;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

/** Shared list row anatomy for career collections (applications, positions, projects). */
export function CareerListRow({
  to,
  leading,
  title,
  subtitle,
  meta,
  trailing,
  className,
}: CareerListRowProps) {
  return (
    <li
      className={cn(
        'group rounded-2xl border border-border bg-card transition-colors',
        'focus-within:border-primary focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-background',
        className,
      )}
    >
      <div className="flex h-20 min-w-0 items-center gap-3 px-3 sm:gap-4 sm:px-4">
        <Link
          to={to}
          className={cn(
            'flex min-w-0 flex-1 items-center gap-3 sm:gap-4',
            'focus-visible:outline-none',
          )}
        >
          {leading ? <div className="shrink-0">{leading}</div> : null}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              {title && title !== leading ? (
                <h3 className="body-2 min-w-0 truncate font-semibold text-foreground">{title}</h3>
              ) : null}
            </div>
            {subtitle && subtitle !== title ? (
              <p className="body-3 mt-0.5 truncate text-muted-foreground">{subtitle}</p>
            ) : null}
            {meta ? (
              <p className="mt-1 truncate font-mono text-xs tracking-wide text-muted-foreground/80 tabular-nums">
                {meta}
              </p>
            ) : null}
          </div>
        </Link>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
        <ChevronRightIcon
          className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden
        />
      </div>
    </li>
  );
}

interface CareerListProps {
  children: ReactNode;
  className?: string;
}

export function CareerList({ children, className }: CareerListProps) {
  return <ul className={cn('flex flex-col gap-2.5', className)}>{children}</ul>;
}

interface CareerCollectionEmptyProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  /** Use 'search' for "no results match your filters" vs the default "nothing here yet". */
  variant?: 'dashed' | 'search';
}

interface CareerCollectionProps<T> {
  items: T[];
  keyFor: (item: T) => string;
  hrefFor: (item: T) => string;
  title: (item: T) => ReactNode;
  subtitle?: (item: T) => ReactNode;
  meta?: (item: T) => ReactNode;
  trailing?: (item: T) => ReactNode;
  leading?: (item: T) => ReactNode;
  empty: CareerCollectionEmptyProps;
  className?: string;
}

/**
 * The one place a page should reach for to render a collection of career
 * entities (positions, projects, testimonials, applications…). Owns both the
 * populated-list and empty-state rendering so every collection in the app
 * looks the same without every route hand-rolling its own markup.
 */
export function CareerCollection<T>({
  items,
  keyFor,
  hrefFor,
  title,
  subtitle,
  meta,
  trailing,
  leading,
  empty,
  className,
}: CareerCollectionProps<T>) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={empty.icon}
        title={empty.title}
        description={empty.description}
        action={empty.action}
        variant={empty.variant ?? 'dashed'}
        className={className}
      />
    );
  }

  return (
    <CareerList className={className}>
      {items.map((item) => (
        <CareerListRow
          key={keyFor(item)}
          to={hrefFor(item)}
          leading={leading?.(item)}
          title={title(item)}
          subtitle={subtitle?.(item)}
          meta={meta?.(item)}
          trailing={trailing?.(item)}
        />
      ))}
    </CareerList>
  );
}
