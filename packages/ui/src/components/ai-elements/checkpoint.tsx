'use client';

import { Check, Circle, Loader2 } from 'lucide-react';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

type CheckpointStatus = 'pending' | 'in-progress' | 'completed' | 'error';

interface CheckpointProps extends HTMLAttributes<HTMLDivElement> {
  status?: CheckpointStatus;
  title: string;
  description?: string;
  isActive?: boolean;
}

export function Checkpoint({
  status = 'pending',
  title,
  description,
  isActive = false,
  className,
  children,
  ...props
}: CheckpointProps) {
  const statusIcons = {
    pending: <Circle className="size-4 text-muted-foreground" />,
    'in-progress': <Loader2 className="size-4 animate-spin text-primary" />,
    completed: <Check className="size-4 text-green-500" />,
    error: <Circle className="size-4 text-destructive" />,
  };

  const statusColors = {
    pending: 'text-muted-foreground',
    'in-progress': 'text-primary',
    completed: 'text-green-500',
    error: 'text-destructive',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border',
        isActive && 'bg-primary/5',
        className,
      )}
      {...props}
    >
      <div className={cn('mt-0.5', statusColors[status])}>{statusIcons[status]}</div>
      <div className="flex-1">
        <h4 className="text-sm font-medium">{title}</h4>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {children}
      </div>
    </div>
  );
}

interface CheckpointListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function CheckpointList({ children, className, ...props }: CheckpointListProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      {children}
    </div>
  );
}

interface CheckpointProgressProps extends HTMLAttributes<HTMLDivElement> {
  current: number;
  total: number;
  label?: string;
}

export function CheckpointProgress({
  current,
  total,
  label,
  className,
  ...props
}: CheckpointProgressProps) {
  const progress = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className={cn('space-y-2', className)} {...props}>
      {label && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span>
            {current}/{total}
          </span>
        </div>
      )}
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
