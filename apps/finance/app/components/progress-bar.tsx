import { cn } from '~/lib/utils';

export function ProgressBar({
  className,
  progress = 0,
}: {
  className?: string;
  progress?: number;
}) {
  return (
    <div className={cn('w-full h-[2px] border-t border-foreground overflow-hidden', className)}>
      <div
        className={cn('h-full border-t border-warning')}
        style={{
          width: `${Math.min(100, Math.max(0, progress))}%`,
          opacity: progress === 100 ? 0 : 0.8,
          // VOID violation: boxShadow removed per design system (no shadows/depth effects)
        }}
      />
    </div>
  );
}
