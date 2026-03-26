import { ChevronDown, ChevronUp, Loader2, Wrench } from 'lucide-react';
import { type HTMLAttributes, type ReactNode, useState } from 'react';

import { cn } from '../../lib/utils';

interface ToolProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  status?: 'pending' | 'running' | 'completed' | 'error';
  isOpen?: boolean;
}

export function Tool({
  name,
  status = 'pending',
  isOpen: defaultOpen = true,
  children,
  className,
  ...props
}: ToolProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const statusConfig = {
    pending: {
      container: 'border-[var(--color-border-subtle)] bg-[var(--color-bg-inset)]',
      icon: <Wrench className="size-3.5 text-[var(--color-text-tertiary)]" />,
    },
    running: {
      container: 'border-[var(--color-accent)]/20 bg-[var(--color-accent-subtle)]',
      icon: <Loader2 className="size-3.5 animate-spin text-[var(--color-accent)]" />,
    },
    completed: {
      container: 'border-[var(--color-border-subtle)] bg-[var(--color-bg-inset)]',
      icon: <span className="text-[12px] text-green-600">✓</span>,
    },
    error: {
      container: 'border-[var(--color-destructive)]/20 bg-[var(--color-destructive-subtle)]',
      icon: <span className="text-[12px] text-[var(--color-destructive)]">✗</span>,
    },
  };

  const config = statusConfig[status];

  return (
    <div className={cn('rounded-xl border', config.container, className)} {...props}>
      <button
        type="button"
        className={cn(
          'flex w-full items-center justify-between px-3.5 py-2.5 transition-colors',
          status === 'running' && 'cursor-wait',
        )}
        onClick={() => setIsOpen(!isOpen)}
        disabled={status === 'running'}
      >
        <div className="flex items-center gap-2">
          {config.icon}
          <span className="font-mono text-[12px] font-medium text-[var(--color-text-secondary)]">
            {name}
          </span>
        </div>
        {isOpen ? (
          <ChevronUp className="size-3.5 text-[var(--color-text-tertiary)]" />
        ) : (
          <ChevronDown className="size-3.5 text-[var(--color-text-tertiary)]" />
        )}
      </button>

      {isOpen && <div className="border-t border-inherit px-3.5 pb-3 pt-2">{children}</div>}
    </div>
  );
}

interface ToolHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ToolHeader({ children, className, ...props }: ToolHeaderProps) {
  return (
    <div
      className={cn('text-[13px] font-medium text-[var(--color-text-primary)]', className)}
      {...props}
    >
      {children}
    </div>
  );
}

interface ToolInputProps extends HTMLAttributes<HTMLPreElement> {
  children?: string;
}

export function ToolInput({ children, className, ...props }: ToolInputProps) {
  if (!children) return null;

  return (
    <pre
      className={cn(
        'mt-1.5 overflow-x-auto rounded-lg bg-[var(--color-bg-inset)] p-2.5 font-mono text-[11px] leading-relaxed text-[var(--color-text-tertiary)]',
        className,
      )}
      {...props}
    >
      {children}
    </pre>
  );
}

interface ToolOutputProps extends HTMLAttributes<HTMLPreElement> {
  children?: string;
  isError?: boolean;
}

export function ToolOutput({ children, isError = false, className, ...props }: ToolOutputProps) {
  if (!children) return null;

  return (
    <pre
      className={cn(
        'mt-1.5 overflow-x-auto rounded-lg bg-[var(--color-bg-inset)] p-2.5 font-mono text-[11px] leading-relaxed',
        isError ? 'text-[var(--color-destructive)]' : 'text-[var(--color-text-tertiary)]',
        className,
      )}
      {...props}
    >
      {children}
    </pre>
  );
}
