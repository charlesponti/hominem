'use client';

import { Clock, GripVertical } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

type QueueItemStatus = 'pending' | 'running' | 'paused' | 'completed' | 'error';

interface QueueProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Queue({ children, className, ...props }: QueueProps) {
  return (
    <div className={cn('rounded-lg border', className)} {...props}>
      {children}
    </div>
  );
}

interface QueueHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  count?: number;
}

export function QueueHeader({
  title = 'Queue',
  count,
  className,
  children,
  ...props
}: QueueHeaderProps) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 border-b', className)} {...props}>
      <Clock className="size-4 text-muted-foreground" />
      <span className="text-sm font-medium">
        {title}
        {count !== undefined && <span className="ml-1 text-muted-foreground">({count})</span>}
      </span>
      {children}
    </div>
  );
}

interface QueueItemProps extends HTMLAttributes<HTMLDivElement> {
  id: string;
  status?: QueueItemStatus;
  title: string;
  description?: string;
}

export function QueueItem({
  status = 'pending',
  title,
  description,
  className,
  children,
  ...props
}: QueueItemProps) {
  const statusColors = {
    pending: 'bg-muted',
    running: 'bg-primary/10',
    paused: 'bg-warning/10',
    completed: 'bg-success/10',
    error: 'bg-destructive/10',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border-b last:border-b-0',
        statusColors[status],
        className,
      )}
      {...props}
    >
      <Button type="button" variant="ghost" size="icon" className="size-5 mt-0.5 cursor-grab">
        <GripVertical className="size-3" />
      </Button>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium">{title}</h4>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {children}
      </div>
    </div>
  );
}

interface QueueContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function QueueContent({ children, className, ...props }: QueueContentProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

interface QueueActionsProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function QueueActions({ children, className, ...props }: QueueActionsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)} {...props}>
      {children}
    </div>
  );
}
