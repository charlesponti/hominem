import { ChevronRightIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { cn } from '~/lib/utils';

export const careerListShellClass =
  'overflow-hidden rounded-3xl border border-border bg-surface shadow-xs';

interface CareerListRowProps {
  to: string;
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

/** Shared list row anatomy for career collections (applications, positions). */
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
          'group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-muted/50 sm:px-5',
          'focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none',
          className,
        )}
      >
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="heading-4 truncate text-foreground">{title}</h3>
          {subtitle ? <p className="body-3 truncate text-muted-foreground">{subtitle}</p> : null}
          {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
        <ChevronRightIcon
          className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
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
  return (
    <ul className={cn('divide-y divide-border', careerListShellClass, className)}>{children}</ul>
  );
}
