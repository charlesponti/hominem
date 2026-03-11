'use client';

import type { HTMLAttributes } from 'react';

import { cn } from '../../lib/utils';

interface ShimmerProps extends HTMLAttributes<HTMLDivElement> {
  isLoading?: boolean;
}

export function Shimmer({ isLoading = true, className, children, ...props }: ShimmerProps) {
  return (
    <div className={cn('relative', className)} {...props}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-muted-foreground/20 to-transparent" />
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
            'h-4 rounded bg-muted animate-pulse',
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

  return (
    <div
      className={cn('flex w-full gap-4 p-4', isUser ? 'flex-row-reverse' : 'flex-row', className)}
      {...props}
    >
      <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
      <div className={cn('flex flex-col gap-1 max-w-[80%]', isUser && 'items-end')}>
        <div className={cn('rounded-2xl px-4 py-3 space-y-2', isUser ? 'bg-primary' : 'bg-muted')}>
          <div className="h-4 w-48 rounded bg-muted-foreground/20 animate-pulse" />
          <div className="h-4 w-32 rounded bg-muted-foreground/20 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
