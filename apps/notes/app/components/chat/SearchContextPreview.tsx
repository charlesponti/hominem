import { Button } from '@hominem/ui/button';

import type { SearchContextPreviewProps } from './types.js';

export function SearchContextPreview({ searchContext, onRemove }: SearchContextPreviewProps) {
  if (!searchContext) return null;

  return (
    <div className="mb-4 p-3 border border-border rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">Web Search Context</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-xs text-muted-foreground"
        >
          Remove
        </Button>
      </div>
      <p className="text-xs text-muted-foreground max-h-20 overflow-y-auto">
        {searchContext.substring(0, 200)}...
      </p>
    </div>
  );
}
