import { describe, expect, test, vi } from 'vitest';

import { renderHook, waitFor } from '../test-utils';
import { useFilterState } from './use-filter-state';

describe('useFilterState', () => {
  test('initializes with initialFilters', () => {
    const initialFilters = { name: 'test', age: 25 };
    const { result } = renderHook(() => useFilterState({ initialFilters }));

    expect(result.current.filters).toEqual(initialFilters);
  });

  test('setFilters updates filters with object', async () => {
    const initialFilters = { name: 'test', age: 25 };
    const { result } = renderHook(() => useFilterState({ initialFilters }));

    await waitFor(() => {
      result.current.setFilters({ name: 'updated', age: 30 });
    });

    await waitFor(() => {
      expect(result.current.filters).toEqual({ name: 'updated', age: 30 });
    });
  });

  test('setFilters updates filters with updater function', async () => {
    const initialFilters = { name: 'test', age: 25 };
    const { result } = renderHook(() => useFilterState({ initialFilters }));

    await waitFor(() => {
      result.current.setFilters((prev) => ({ ...prev, age: 30 }));
    });

    await waitFor(() => {
      expect(result.current.filters).toEqual({ name: 'test', age: 30 });
    });
  });

  test('updateFilter updates single key', async () => {
    const initialFilters = { name: 'test', age: 25 };
    const { result } = renderHook(() => useFilterState({ initialFilters }));

    await waitFor(() => {
      result.current.updateFilter('name', 'updated');
    });

    await waitFor(() => {
      expect(result.current.filters).toEqual({ name: 'updated', age: 25 });
    });
  });

  test('clearFilters resets to initial', async () => {
    const initialFilters = { name: 'test', age: 25 };
    const { result } = renderHook(() => useFilterState({ initialFilters }));

    await waitFor(() => {
      result.current.setFilters({ name: 'updated', age: 30 });
    });

    await waitFor(() => {
      result.current.clearFilters();
    });

    await waitFor(() => {
      expect(result.current.filters).toEqual(initialFilters);
    });
  });

  test('resetFilters resets to initial state', async () => {
    const initialFilters = { name: 'test', age: 25 };
    const { result } = renderHook(() => useFilterState({ initialFilters }));

    await waitFor(() => {
      result.current.setFilters({ name: 'updated', age: 30 });
    });

    await waitFor(() => {
      result.current.resetFilters();
    });

    await waitFor(() => {
      expect(result.current.filters).toEqual(initialFilters);
    });
  });

  test('calls onFiltersChange when filters change', async () => {
    const initialFilters = { name: 'test', age: 25 };
    const onFiltersChange = vi.fn();
    const { result } = renderHook(() => useFilterState({ initialFilters, onFiltersChange }));

    await waitFor(() => {
      result.current.setFilters({ name: 'updated', age: 30 });
    });

    expect(onFiltersChange).toHaveBeenCalledWith({ name: 'updated', age: 30 });
  });

  test('debounces onFiltersChange when debounceMs is provided', async () => {
    const initialFilters = { name: 'test', age: 25 };
    const onFiltersChange = vi.fn();
    const { result } = renderHook(() =>
      useFilterState({ initialFilters, onFiltersChange, debounceMs: 100 }),
    );

    await waitFor(() => {
      result.current.setFilters({ name: 'updated', age: 30 });
    });

    // Callback should not be called immediately
    expect(onFiltersChange).not.toHaveBeenCalled();

    // Wait for debounce to complete (slightly more than debounceMs)
    await new Promise((resolve) => setTimeout(resolve, 150));

    // After debounce period, callback should be called
    expect(onFiltersChange).toHaveBeenCalledWith({ name: 'updated', age: 30 });
  });

  test('clears debounce timer on unmount', () => {
    vi.useFakeTimers();
    const initialFilters = { name: 'test', age: 25 };
    const onFiltersChange = vi.fn();
    const { result, unmount } = renderHook(() =>
      useFilterState({ initialFilters, onFiltersChange, debounceMs: 100 }),
    );

    result.current.setFilters({ name: 'updated', age: 30 });
    unmount();

    vi.advanceTimersByTime(100);
    // onFiltersChange should not be called after unmount
    expect(onFiltersChange).not.toHaveBeenCalled();

    vi.useRealTimers();
  });
});
