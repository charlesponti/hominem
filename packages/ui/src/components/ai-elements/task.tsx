'use client';

import { Check, Circle, Clock, Flag } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

type TaskStatus = 'pending' | 'in-progress' | 'completed' | 'cancelled';

interface TaskProps extends HTMLAttributes<HTMLDivElement> {
  status?: TaskStatus;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  assignee?: string;
  onToggle?: () => void;
}

export function Task({
  status = 'pending',
  title,
  description,
  priority,
  dueDate,
  assignee,
  onToggle,
  className,
  children,
  ...props
}: TaskProps) {
  const statusIcons = {
    pending: <Circle className="size-4 text-muted-foreground" />,
    'in-progress': <Clock className="size-4 text-primary animate-pulse" />,
    completed: <Check className="size-4 text-success" />,
    cancelled: <Circle className="size-4 text-muted-foreground line-through" />,
  };

  const priorityColors = {
    low: 'text-muted-foreground',
    medium: 'text-warning',
    high: 'text-destructive',
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border bg-background',
        status === 'completed' && 'opacity-60',
        className,
      )}
      {...props}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-5 mt-0.5"
        onClick={onToggle}
      >
        {statusIcons[status]}
      </Button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={cn('text-sm font-medium', status === 'completed' && 'line-through')}>
            {title}
          </h4>
          {priority && (
            <Flag
              className={cn('size-3', priorityColors[priority])}
              fill={priority === 'high' ? 'currentColor' : 'none'}
            />
          )}
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {dueDate && <span>Due: {dueDate}</span>}
          {assignee && <span>Assigned to: {assignee}</span>}
        </div>
        {children}
      </div>
    </div>
  );
}

interface TaskListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function TaskList({ children, className, ...props }: TaskListProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} {...props}>
      {children}
    </div>
  );
}

interface TaskStatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  status: TaskStatus;
}

export function TaskStatusBadge({ status, className, ...props }: TaskStatusBadgeProps) {
  const statusLabels = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
  };

  const statusColors = {
    pending: 'bg-muted text-muted-foreground',
    'in-progress': 'bg-primary/10 text-primary',
    completed: 'bg-success/10 text-success',
    cancelled: 'bg-muted text-muted-foreground',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs',
        statusColors[status],
        className,
      )}
      {...props}
    >
      {statusLabels[status]}
    </span>
  );
}
