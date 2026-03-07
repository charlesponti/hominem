'use client';

import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { useState, type HTMLAttributes, type ReactNode } from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

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
    <div className={cn('rounded-lg border bg-muted/50', className)} {...props}>
      <Button
        variant="ghost"
        size="sm"
        className="flex w-full items-center justify-between px-3 py-2 text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="size-4" />
          <span className="text-sm font-medium">AI Thinking</span>
        </div>
        {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
      </Button>

      {isOpen && (
        <div className="px-3 pb-3">
          <div className="text-sm whitespace-pre-wrap leading-relaxed opacity-80">{children}</div>
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
    <div className={cn('text-sm whitespace-pre-wrap leading-relaxed', className)} {...props}>
      {children}
    </div>
  );
}
