import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

interface ShimmerProps extends HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
}

export function Shimmer({ isLoading = true, className, children, ...props }: ShimmerProps) {
  return (
    <div className={cn('relative overflow-hidden', className)} {...props}>
      {children}
      {isLoading && (
        <div className="void-anim-breezy-progress absolute inset-0 bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
      )}
    </div>
  );
}

interface ShimmerTextProps extends HTMLAttributes<HTMLSpanElement> {
  lines?: number;
}

export function ShimmerText({ lines = 1, className, ...props }: ShimmerTextProps) {
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-4 rounded-md bg-muted animate-pulse',
            i === lines - 1 && lines > 1 ? 'w-3/4' : 'w-full',
          )}
        />
      ))}
    </div>
  );
}

interface ShimmerMessageProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'user' | 'assistant';
}

export function ShimmerMessage({
  variant = 'assistant',
  className,
  ...props
}: ShimmerMessageProps) {
  const isUser = variant === 'user';

  if (isUser) {
    return (
      <div className={cn('flex w-full justify-end py-2', className)} {...props}>
        <div className="w-full max-w-136">
          <div className="ml-auto space-y-2 rounded-md bg-emphasis-highest px-4 py-3 shadow-low">
            <div className="h-4 w-40 rounded-md bg-primary-foreground/20 animate-pulse" />
            <div className="h-4 w-28 rounded-md bg-primary-foreground/20 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex w-full justify-start py-2', className)} {...props}>
      <div className="w-full max-w-3xl space-y-3">
        <div className="h-4 w-52 rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-full rounded-md bg-muted animate-pulse" />
        <div className="h-4 w-4/5 rounded-md bg-muted animate-pulse" />
      </div>
    </div>
  );
}
