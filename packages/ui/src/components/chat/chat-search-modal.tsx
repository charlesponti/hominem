import { Search, X } from 'lucide-react';

import { Inline } from '../layout';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

interface ChatSearchModalProps {
  visible: boolean;
  searchQuery: string;
  resultCount: number;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onChangeSearchQuery: (value: string) => void;
}

export function ChatSearchModal({
  visible,
  searchQuery,
  resultCount,
  searchInputRef,
  onClose,
  onChangeSearchQuery,
}: ChatSearchModalProps) {
  if (!visible) return null;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-4 z-20 px-4 sm:px-6">
      <div
        className="pointer-events-auto mx-auto w-full rounded-md border border-border-subtle bg-background/95 p-4 backdrop-blur supports-backdrop-filter:bg-background/90"
        style={{ maxWidth: 720 }}
      >
        <div className="mb-3 text-xs font-medium tracking-[0.05em] text-text-tertiary">
          Search messages
        </div>
        <Inline gap="sm">
          <Search className="size-4 text-text-tertiary" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(event) => onChangeSearchQuery(event.target.value)}
            className="flex-1 border-0 bg-transparent text-sm placeholder:text-text-tertiary focus:ring-0"
            autoFocus
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                onClose();
              }
            }}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            aria-label="Close search"
            className="text-text-tertiary hover:bg-transparent hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </Inline>
        {searchQuery ? (
          <div className="mt-2 px-1 text-xs text-text-tertiary">
            {resultCount} {resultCount === 1 ? 'match' : 'matches'}
          </div>
        ) : null}
      </div>
    </div>
  );
}
