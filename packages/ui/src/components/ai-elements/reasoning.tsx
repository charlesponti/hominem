import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/utils';

interface ReasoningProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  isOpen?: boolean;
}

export function Reasoning({
  children,
  isOpen: defaultOpen = false,
  className,
  ...props
}: ReasoningProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        'rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-inset)]',
        className,
      )}
      {...props}
    >
      <button
        type="button"
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="flex size-5 items-center justify-center rounded-md bg-[var(--color-accent-subtle)]">
            <span className="text-[10px] text-[var(--color-accent)]">✦</span>
          </span>
          <span className="text-[13px] font-medium">Thinking</span>
        </div>
        {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
      </button>

      {isOpen && (
        <div className="border-t border-[var(--color-border-subtle)] px-3.5 pb-3 pt-2.5">
          <div className="text-[13px] whitespace-pre-wrap leading-relaxed text-[var(--color-text-secondary)]">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

interface ReasoningContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function ReasoningContent({ children, className, ...props }: ReasoningContentProps) {
  return (
    <div
      className={cn(
        'text-[13px] whitespace-pre-wrap leading-relaxed text-[var(--color-text-secondary)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
