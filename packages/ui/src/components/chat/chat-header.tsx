import { Search, X } from 'lucide-react';
import type { RefObject } from 'react';

interface ChatHeaderProps {
  searchQuery: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onChangeSearchQuery: (query: string) => void;
}

export function ChatHeader({ searchQuery, searchInputRef, onChangeSearchQuery }: ChatHeaderProps) {
  return (
    <div className="shrink-0 border-b border-border-subtle bg-background px-4 py-2.5">
      <div className="mx-auto flex w-full max-w-3xl items-center gap-2.5">
        <Search className="size-4 shrink-0 text-text-tertiary" aria-hidden />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => onChangeSearchQuery(e.target.value)}
          placeholder="Search messages…"
          aria-label="Search messages"
          className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-text-tertiary/50"
        />
        {searchQuery ? (
          <button
            type="button"
            onClick={() => onChangeSearchQuery('')}
            aria-label="Clear search"
            className="text-text-tertiary transition-colors hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
