'use client';

import { Check, ChevronRight, ListOrdered, Circle } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';

type PlanStepStatus = 'pending' | 'in-progress' | 'completed' | 'skipped';

interface PlanProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Plan({ children, className, ...props }: PlanProps) {
  return (
    <div className={cn('rounded-lg border', className)} {...props}>
      {children}
    </div>
  );
}

interface PlanHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function PlanHeader({ title = 'Plan', className, children, ...props }: PlanHeaderProps) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 border-b', className)} {...props}>
      <ListOrdered className="size-4 text-muted-foreground" />
      <span className="text-sm font-medium">{title}</span>
      {children}
    </div>
  );
}

interface PlanStepProps extends HTMLAttributes<HTMLDivElement> {
  index: number;
  status?: PlanStepStatus;
  title: string;
  description?: string;
}

export function PlanStep({
  index,
  status = 'pending',
  title,
  description,
  className,
  children,
  ...props
}: PlanStepProps) {
  const statusIcons = {
    pending: <Circle className="size-4 text-muted-foreground" />,
    'in-progress': <ChevronRight className="size-4 text-primary animate-pulse" />,
    completed: <Check className="size-4 text-success" />,
    skipped: <ChevronRight className="size-4 text-muted-foreground line-through" />,
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border-b last:border-b-0',
        status === 'in-progress' && 'bg-primary/5',
        className,
      )}
      {...props}
    >
      <div className="mt-0.5">{statusIcons[status]}</div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{index + 1}.</span>
          <h4 className="text-sm font-medium">{title}</h4>
        </div>
        {description && <p className="text-xs text-muted-foreground mt-1">{description}</p>}
        {children}
      </div>
    </div>
  );
}

interface PlanContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function PlanContent({ children, className, ...props }: PlanContentProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

interface PlanFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function PlanFooter({ children, className, ...props }: PlanFooterProps) {
  return (
    <div
      className={cn('flex items-center justify-end gap-2 px-3 py-2 border-t', className)}
      {...props}
    >
      {children}
    </div>
  );
}
