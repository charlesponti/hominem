import { Search, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { AnimatedPill } from '~/components/animated-pill';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { cn } from '~/lib/utils';

export interface ChatMessageSearchProps {
  isOpen?: boolean;
  query: string;
  error: Error | null;
  onChange: (query: string) => void;
  onClose: () => void;
}

export function ChatMessageSearch({
  isOpen = true,
  query,
  error,
  onChange,
  onClose,
}: ChatMessageSearchProps) {
  const hasStatus = Boolean(error);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  return (
    <div
      aria-hidden={!isOpen}
      data-chat-search
      className={cn(
        'absolute inset-0 z-10 flex min-w-0 items-center transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none motion-reduce:transform-none',
        isOpen ? 'translate-x-0 opacity-100' : 'pointer-events-none translate-x-2 opacity-0',
      )}
    >
      <div className="relative flex min-w-0 flex-1 items-center overflow-hidden rounded-full border border-border bg-muted">
        <div className="flex shrink-0 items-center justify-center px-2.5 text-secondary">
          <Search aria-hidden="true" size={15} />
        </div>
        <Input
          ref={inputRef}
          aria-label="Search messages"
          className="h-7 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-sm focus-visible:border-0 focus-visible:ring-0"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search messages"
          tabIndex={isOpen ? 0 : -1}
          value={query}
        />
        <Button
          aria-label="Close message search"
          className="mr-0.5 size-6 rounded-full text-primary hover:bg-destructive/80"
          onClick={onClose}
          size="icon-sm"
          type="button"
        >
          <X aria-hidden="true" size={14} />
        </Button>
      </div>
      <AnimatedPill
        direction="down"
        className="absolute top-full right-0 left-0 mt-1"
        dismissLabel="Dismiss search error"
        isDismissible
        isOpen={hasStatus}
        resetKey={error}
      >
        <p
          aria-live="polite"
          className={cn('min-w-0 text-muted-foreground', error && 'text-destructive-text')}
          role={error ? 'alert' : undefined}
        >
          {error ? error.message : null}
        </p>
      </AnimatedPill>
    </div>
  );
}
