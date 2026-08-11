import { Input } from '@ponti-studios/ui/forms';
import { SearchIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '~/lib/utils';

interface ExpandableSearchProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  ariaLabel: string;
  className?: string;
}

export function ExpandableSearch({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: ExpandableSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(Boolean(value));

  useEffect(() => {
    if (value) setIsOpen(true);
  }, [value]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  return (
    <div className={cn('relative flex h-8 items-center justify-end', className)}>
      <div
        aria-hidden={!isOpen}
        className={cn(
          'absolute right-8 origin-right transition-[transform,opacity] duration-200 ease-[var(--ease-out)]',
          isOpen
            ? 'pointer-events-auto scale-x-100 opacity-100'
            : 'pointer-events-none scale-x-95 opacity-0',
        )}
      >
        <Input
          ref={inputRef}
          id={id}
          type="search"
          tabIndex={isOpen ? 0 : -1}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className="h-8 w-64 max-w-[calc(100vw-6rem)] bg-background pr-2"
        />
      </div>
      <button
        type="button"
        aria-label={isOpen ? `Close ${ariaLabel.toLowerCase()}` : `Open ${ariaLabel.toLowerCase()}`}
        aria-expanded={isOpen}
        aria-controls={id}
        onClick={() => setIsOpen((open) => !open)}
        className="focus-visible:ring-ring relative z-10 flex size-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:outline-none"
      >
        <SearchIcon className="size-4" aria-hidden />
      </button>
    </div>
  );
}
