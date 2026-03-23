import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';

export type SortField = string;
export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  field: SortField;
  direction: SortDirection;
}

interface UseSortOptions {
  initialSortOptions?: SortOption[];
  singleSort?: boolean; // If true, only allow one sort option
  urlParamName?: string; // URL param name for sort (default: 'sort')
}

function parseSortFromUrl(urlSortParam: string): SortOption[] {
  try {
    // Try parsing as JSON array for multi-sort
    const parsed = JSON.parse(urlSortParam);
    if (Array.isArray(parsed)) {
      return parsed as SortOption[];
    }
    if (parsed.field && parsed.direction) {
      return [parsed as SortOption];
    }
  } catch {
    // Try simple format: "field:direction"
    const [field, direction] = urlSortParam.split(':');
    if (field && (direction === 'asc' || direction === 'desc')) {
      return [{ field, direction: direction as SortDirection }];
    }
  }
  return [];
}

export function useSort(options: UseSortOptions = {}) {
  const { initialSortOptions = [], singleSort = false, urlParamName = 'sort' } = options;

  const [searchParams, setSearchParams] = useSearchParams();
  const isInitialMountRef = useRef(true);
  const [sortOptions, setSortOptionsState] = useState<SortOption[]>(() => {
    const urlSortParam = searchParams.get(urlParamName);
    if (urlSortParam) {
      const parsed = parseSortFromUrl(urlSortParam);
      if (parsed.length > 0) {
        return parsed;
      }
    }
    return initialSortOptions;
  });

  // Sync sort options to URL when they change (but not on initial mount)
  useEffect(() => {
    if (isInitialMountRef.current) {
      return;
    }

    const newSearchParams = new URLSearchParams(searchParams);
    if (sortOptions.length === 0) {
      newSearchParams.delete(urlParamName);
    } else if (singleSort && sortOptions.length > 0) {
      const sort = sortOptions[0];
      if (sort) {
        newSearchParams.set(urlParamName, `${sort.field}:${sort.direction}`);
      }
    } else {
      newSearchParams.set(urlParamName, JSON.stringify(sortOptions));
    }

    setSearchParams(newSearchParams, { replace: true });
  }, [sortOptions, sortOptions.length, urlParamName, searchParams, setSearchParams, singleSort]);

  // Sync filters when URL changes externally (e.g., browser back/forward)
  // biome-ignore lint/correctness/useExhaustiveDependencies: searchParams is stable from hook
  useEffect(() => {
    if (isInitialMountRef.current) {
      return;
    }

    const urlSortParam = searchParams.get(urlParamName);
    if (urlSortParam) {
      const parsed = parseSortFromUrl(urlSortParam);
      if (parsed.length > 0) {
        setSortOptionsState(parsed);
      }
    } else if (sortOptions.length > 0) {
      // URL was cleared, clear sort options
      setSortOptionsState([]);
    }
  }, [searchParams, urlParamName]);

  // After initial mount, flip the flag so subsequent updates run their sync logic
  useEffect(() => {
    isInitialMountRef.current = false;
  }, []);

  const setSortOptions = useCallback(
    (options: SortOption[]) => {
      if (singleSort && options.length > 1) {
        // In single-sort mode, only keep the first option
        const firstOption = options[0];
        if (firstOption) {
          setSortOptionsState([firstOption]);
        }
      } else {
        setSortOptionsState(options);
      }
    },
    [singleSort],
  );

  const addSortOption = useCallback(
    (option: SortOption) => {
      if (singleSort) {
        // In single-sort mode, replace instead of add
        setSortOptionsState([option]);
      } else {
        setSortOptionsState((prevOptions) => [...prevOptions, option]);
      }
    },
    [singleSort],
  );

  const removeSortOption = useCallback((index: number) => {
    setSortOptionsState((prevOptions) => prevOptions.filter((_, i) => i !== index));
  }, []);

  const updateSortOption = useCallback((index: number, option: SortOption) => {
    setSortOptionsState((prevOptions) =>
      prevOptions.map((item, i) => (i === index ? option : item)),
    );
  }, []);

  const clearSort = useCallback(() => {
    setSortOptionsState([]);
  }, []);

  return {
    sortOptions,
    setSortOptions,
    addSortOption,
    removeSortOption,
    updateSortOption,
    clearSort,
  };
}
