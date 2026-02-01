import { useCallback, useEffect, useRef, useState } from 'react';

interface UseFilterStateOptions<T> {
  initialFilters: T;
  onFiltersChange?: (filters: T) => void;
  debounceMs?: number; // For search-like filters
}

export function useFilterState<T extends Record<string, unknown>>(
  options: UseFilterStateOptions<T>,
) {
  const { initialFilters, onFiltersChange, debounceMs } = options;
  const [filters, setFiltersState] = useState<T>(initialFilters);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const setFilters = useCallback(
    (newFilters: T | ((prev: T) => T)) => {
      const updatedFilters = typeof newFilters === 'function' ? newFilters(filters) : newFilters;
      setFiltersState(updatedFilters);

      if (debounceMs && debounceMs > 0) {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          onFiltersChange?.(updatedFilters);
        }, debounceMs);
      } else {
        onFiltersChange?.(updatedFilters);
      }
    },
    [filters, onFiltersChange, debounceMs],
  );

  const updateFilter = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [setFilters],
  );

  const clearFilters = useCallback(() => {
    setFiltersState(initialFilters);
    onFiltersChange?.(initialFilters);
  }, [initialFilters, onFiltersChange]);

  const resetFilters = useCallback(() => {
    setFiltersState(initialFilters);
    onFiltersChange?.(initialFilters);
  }, [initialFilters, onFiltersChange]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
    resetFilters,
  };
}
