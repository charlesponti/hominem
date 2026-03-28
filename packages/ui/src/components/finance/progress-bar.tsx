import { cn } from '../../lib/utils';

export interface ProgressBarProps {
  className?: string;
  progress?: number;
}

export function ProgressBar({ className, progress = 0 }: ProgressBarProps) {
  return (
    <div className={cn('h-[2px] w-full overflow-hidden border-t border-foreground', className)}>
      <div
        className={cn('h-full border-t border-warning')}
        style={{
          width: `${Math.min(100, Math.max(0, progress))}%`,
          opacity: progress === 100 ? 0 : 0.8,
        }}
      />
    </div>
  );
}
