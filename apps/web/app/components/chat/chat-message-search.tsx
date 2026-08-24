import { Search, X } from 'lucide-react';

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

  return (
    <div
      aria-hidden={!isOpen}
      className={cn(
        'relative z-0 grid overflow-hidden transition-[grid-template-rows,margin,opacity,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none motion-reduce:transform-none',
        isOpen
          ? 'my-3 grid-rows-[1fr] translate-y-0 opacity-100'
          : 'pointer-events-none my-0 grid-rows-[0fr] -translate-y-4 opacity-0',
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="relative z-10 flex items-center overflow-hidden rounded-full border border-border-subtle bg-muted">
          <div className="flex shrink-0 items-center justify-center px-3 text-secondary">
            <Search aria-hidden="true" size={16} />
          </div>
          <Input
            aria-label="Search messages"
            autoFocus
            className="h-10 min-w-0 flex-1 rounded-none border-0 bg-transparent px-0 text-sm focus-visible:border-0 focus-visible:ring-0"
            onChange={(event) => onChange(event.target.value)}
            placeholder="Search messages"
            value={query}
          />
          <Button
            aria-label="Close message search"
            className="mr-1 rounded-full p-4 text-primary bg-destructive"
            onClick={onClose}
            size="icon-sm"
            type="button"
          >
            <X aria-hidden="true" size={16} />
          </Button>
        </div>
        <AnimatedPill
          direction="down"
          className="-mt-1"
          dismissLabel="Dismiss search error"
          isDismissible
          isOpen={hasStatus}
          resetKey={error}
        >
          <p
            aria-live="polite"
            className={cn('min-w-0 text-text-secondary', error && 'text-destructive')}
            role={error ? 'alert' : undefined}
          >
            {error ? error.message : null}
          </p>
        </AnimatedPill>
      </div>
    </div>
  );
}
