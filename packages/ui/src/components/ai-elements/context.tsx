

import { BookOpen } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '../../lib/utils';

interface ContextProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Context({ children, className, ...props }: ContextProps) {
  return (
    <div className={cn('rounded-md border', className)} {...props}>
      {children}
    </div>
  );
}

interface ContextHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  count?: number;
}

export function ContextHeader({
  title = 'Context',
  count,
  className,
  children,
  ...props
}: ContextHeaderProps) {
  return (
    <div className={cn('flex items-center gap-2 px-3 py-2 border-b', className)} {...props}>
      <BookOpen className="size-4 text-muted-foreground" />
      <span className="text-sm font-medium">
        {title}
        {count !== undefined && <span className="ml-1 text-muted-foreground">({count})</span>}
      </span>
      {children}
    </div>
  );
}

interface ContextItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ContextItem({ children, className, ...props }: ContextItemProps) {
  return (
    <div className={cn('p-3 border-b last:border-b-0', className)} {...props}>
      {children}
    </div>
  );
}

interface ContextContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ContextContent({ children, className, ...props }: ContextContentProps) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

interface InlineCitationProps extends HTMLAttributes<HTMLSpanElement> {
  index: number;
  onClick?: () => void;
}

export function InlineCitation({ index, onClick, className, ...props }: InlineCitationProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center text-xs text-primary hover:underline cursor-pointer',
        className,
      )}
      onClick={onClick}
      {...props}
    >
      <sup className="mr-0.5">[{index}]</sup>
    </button>
  );
}

interface CitationMarkerProps extends HTMLAttributes<HTMLSpanElement> {
  index: number;
}

export function CitationMarker({ index, className, ...props }: CitationMarkerProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center w-5 h-5 text-xs rounded-full bg-primary/10 text-primary font-medium',
        className,
      )}
      {...props}
    >
      {index}
    </span>
  );
}
