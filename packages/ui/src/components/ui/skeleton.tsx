import { cn } from '../../lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-sm bg-[var(--color-emphasis-faint)]', className)}
      {...props}
    />
  );
}

export { Skeleton };
