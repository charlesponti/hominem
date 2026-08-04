import { SortOption } from '@ponti-studios/ui/hooks';
import { useState } from 'react';

interface UseSortOptions {
  initialSortOptions?: SortOption[];
}

export function useSort(options: UseSortOptions = {}) {
  const initialSortOptions = options.initialSortOptions ?? [];
  const [sortOptions, setSortOptions] = useState<SortOption[]>(initialSortOptions);

  const isDefaultSort =
    sortOptions.length === initialSortOptions.length &&
    sortOptions.every(
      (o, i) =>
        o.field === initialSortOptions[i]?.field &&
        o.direction === initialSortOptions[i]?.direction,
    );

  return {
    sortOptions,
    isDefaultSort,
    addSortOption: (opt: SortOption) => setSortOptions((prev) => [...prev, opt]),
    updateSortOption: (index: number, opt: SortOption) =>
      setSortOptions((prev) => prev.map((o, i) => (i === index ? opt : o))),
    removeSortOption: (index: number) =>
      setSortOptions((prev) => prev.filter((_, i) => i !== index)),
  };
}
