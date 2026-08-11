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
    <li>
      <Link
        to={to}
        className={cn(
          'group flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3.5 transition-all duration-150 sm:px-5',
          'hover:border-(--tertiary)/60 hover:bg-popover',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
          className,
        )}
      >
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1 space-y-1">
          {title && title !== leading ? (
            <h3 className="heading-4 truncate text-foreground">{title}</h3>
          ) : null}
          {subtitle && subtitle !== title ? (
            <p className="body-3 truncate text-muted-foreground">{subtitle}</p>
          ) : null}
          {meta ? (
            <p className="font-mono text-xs text-muted-foreground/80 tabular-nums">{meta}</p>
          ) : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
        <ChevronRightIcon
          className="size-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-foreground"
          aria-hidden
        />
      </Link>
    </li>
  );
}

interface CareerListProps {
  children: ReactNode;
  className?: string;
}

export function CareerList({ children, className }: CareerListProps) {
  return <ul className={cn('flex flex-col gap-2', className)}>{children}</ul>;
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
