import { Button } from '@ponti-studios/ui/primitives';
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import type { ApplicationsResultsSummaryProps } from './types';

export function ApplicationsResultsSummary({
  page,
  totalPages,
  onPrevPage,
  onNextPage,
}: ApplicationsResultsSummaryProps) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Button
        type="button"
        onClick={onPrevPage}
        disabled={page <= 1}
        variant="outline"
        size="icon"
        aria-label="Previous page"
      >
        <ChevronLeftIcon className="size-4" />
      </Button>
      <span className="body-4 whitespace-nowrap px-1 text-foreground">
        {page} of {totalPages}
      </span>
      <Button
        type="button"
        onClick={onNextPage}
        disabled={page >= totalPages}
        variant="outline"
        size="icon"
        aria-label="Next page"
      >
        <ChevronRightIcon className="size-4" />
      </Button>
    </div>
  );
}
