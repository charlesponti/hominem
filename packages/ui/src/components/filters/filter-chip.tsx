import { X } from 'lucide-react';

import { Button } from '../ui/button';

interface FilterChipProps {
  label: string;
  onRemove: () => void;
  onClick?: () => void; // Reserved for future "edit filter" functionality
}

export function FilterChip({ label, onRemove, onClick }: FilterChipProps) {
  return (
    <div
      className="flex items-center gap-1 bg-muted text-muted-foreground px-2 py-1 rounded-full text-xs cursor-pointer hover:bg-muted-foreground/10 transition-colors"
      title={onClick ? `Click to edit: ${label}` : label}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <span>{label}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-4 rounded-full hover:bg-muted-foreground/20"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={`Remove filter: ${label}`}
      >
        <X className="size-3" />
      </Button>
    </div>
  );
}
