import { describe, expect, test } from 'vitest'
import { renderHook, waitFor } from '../test-utils'
import { type SortOption, useSort } from './use-sort'

describe('useSort', () => {
  test('initializes with initialSortOptions', () => {
    const initialOptions: SortOption[] = [
      { field: 'name', direction: 'asc' },
      { field: 'date', direction: 'desc' },
    ]
    const { result } = renderHook(() => useSort({ initialSortOptions: initialOptions }))

    expect(result.current.sortOptions).toEqual(initialOptions)
  })

  test('addSortOption adds new sort option in multi-sort mode', async () => {
    const { result } = renderHook(() => useSort({ singleSort: false }))

    result.current.addSortOption({ field: 'name', direction: 'asc' })
    result.current.addSortOption({ field: 'date', direction: 'desc' })

    await waitFor(() => {
      expect(result.current.sortOptions).toHaveLength(2)
    })
    expect(result.current.sortOptions[0]).toEqual({ field: 'name', direction: 'asc' })
    expect(result.current.sortOptions[1]).toEqual({ field: 'date', direction: 'desc' })
  })

  test('addSortOption replaces existing option in single-sort mode', async () => {
    const { result } = renderHook(() => useSort({ singleSort: true }))

    result.current.addSortOption({ field: 'name', direction: 'asc' })
    result.current.addSortOption({ field: 'date', direction: 'desc' })

    await waitFor(() => {
      expect(result.current.sortOptions).toHaveLength(1)
    })
    expect(result.current.sortOptions[0]).toEqual({ field: 'date', direction: 'desc' })
  })

  test('removeSortOption removes option by index', async () => {
    const initialOptions: SortOption[] = [
      { field: 'name', direction: 'asc' },
      { field: 'date', direction: 'desc' },
    ]
    const { result } = renderHook(() => useSort({ initialSortOptions: initialOptions }))

    result.current.removeSortOption(0)

    await waitFor(() => {
      expect(result.current.sortOptions).toHaveLength(1)
    })
    expect(result.current.sortOptions[0]).toEqual({ field: 'date', direction: 'desc' })
  })

  test('updateSortOption updates option by index', async () => {
    const initialOptions: SortOption[] = [{ field: 'name', direction: 'asc' }]
    const { result } = renderHook(() => useSort({ initialSortOptions: initialOptions }))

    result.current.updateSortOption(0, { field: 'name', direction: 'desc' })

    await waitFor(() => {
      expect(result.current.sortOptions[0]).toEqual({ field: 'name', direction: 'desc' })
    })
  })

  test('clearSort removes all sort options', async () => {
    const initialOptions: SortOption[] = [
      { field: 'name', direction: 'asc' },
      { field: 'date', direction: 'desc' },
    ]
    const { result } = renderHook(() => useSort({ initialSortOptions: initialOptions }))

    result.current.clearSort()

    await waitFor(() => {
      expect(result.current.sortOptions).toHaveLength(0)
    })
  })

  test('setSortOptions replaces all options', async () => {
    const initialOptions: SortOption[] = [{ field: 'name', direction: 'asc' }]
    const { result } = renderHook(() => useSort({ initialSortOptions: initialOptions }))

    const newOptions: SortOption[] = [
      { field: 'date', direction: 'desc' },
      { field: 'amount', direction: 'asc' },
    ]
    result.current.setSortOptions(newOptions)

    await waitFor(() => {
      expect(result.current.sortOptions).toEqual(newOptions)
    })
  })

  test('setSortOptions respects singleSort mode', async () => {
    const { result } = renderHook(() => useSort({ singleSort: true }))

    const newOptions: SortOption[] = [
      { field: 'date', direction: 'desc' },
      { field: 'amount', direction: 'asc' },
    ]
    result.current.setSortOptions(newOptions)

    await waitFor(() => {
      expect(result.current.sortOptions).toHaveLength(1)
    })
    expect(result.current.sortOptions[0]).toEqual({ field: 'date', direction: 'desc' })
  })
})
