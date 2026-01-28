import { waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { renderHook } from '../test-utils';
import { useUrlFilters } from './use-url-filters';

describe('useUrlFilters', () => {
  test('reads initial filters from URL params', () => {
    const { result } = renderHook(
      () =>
        useUrlFilters({
          initialFilters: { type: '', companion: '' },
          paramMapping: { type: 'type', companion: 'companion' },
        }),
      { initialEntries: ['/?type=Events&companion=John'] },
    );

    expect(result.current.filters.type).toBe('Events');
    expect(result.current.filters.companion).toBe('John');
  });

  test('calls onFiltersChange callback', async () => {
    const onFiltersChange = vi.fn();
    const { result } = renderHook(
      () =>
        useUrlFilters({
          initialFilters: { type: '' },
          paramMapping: { type: 'type' },
          onFiltersChange,
        }),
      { initialEntries: ['/'] },
    );

    await waitFor(() => {
      result.current.updateFilter('type', 'Events');
    });

    expect(onFiltersChange).toHaveBeenCalled();
  });

  test('clearFilters resets filters to initial', async () => {
    const { result } = renderHook(
      () =>
        useUrlFilters({
          initialFilters: { type: '', companion: '' },
          paramMapping: { type: 'type', companion: 'companion' },
        }),
      { initialEntries: ['/?type=Events&companion=John'] },
    );

    await waitFor(() => {
      result.current.clearFilters();
    });

    await waitFor(() => {
      expect(result.current.filters.type).toBe('');
      expect(result.current.filters.companion).toBe('');
    });
  });
});
