import { Badge } from '@ponti-studios/ui/primitives';
import { cn } from '@ponti-studios/ui/utilities';
import type { ReactNode } from 'react';

export type StatusTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger';

const toneClassNames: Record<StatusTone, string> = {
  neutral: 'border-border bg-muted text-muted-foreground',
  info: 'border-accent/30 bg-accent/10 text-accent',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  success: 'border-success/30 bg-success/10 text-success',
  danger: 'border-destructive/30 bg-destructive/10 text-destructive',
};

interface StatusBadgeProps {
  tone: StatusTone;
  label: ReactNode;
  className?: string;
}

export function StatusBadge({ tone, label, className }: StatusBadgeProps) {
  return (
    <Badge variant="outline" className={cn(toneClassNames[tone], className)}>
      {label}
    </Badge>
  );
}
