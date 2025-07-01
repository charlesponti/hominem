import { useCallback, useState } from 'react'

export type SortField = string
export type SortDirection = 'asc' | 'desc'

export interface SortOption {
  field: SortField
  direction: SortDirection
}

export function useSort(initialSortOptions: SortOption[] = []) {
  const [sortOptions, setSortOptions] = useState<SortOption[]>(initialSortOptions)

  const addSortOption = useCallback((option: SortOption) => {
    setSortOptions((prevOptions) => [...prevOptions, option])
  }, [])

  const removeSortOption = useCallback((index: number) => {
    setSortOptions((prevOptions) => prevOptions.filter((_, i) => i !== index))
  }, [])

  const updateSortOption = useCallback((index: number, option: SortOption) => {
    setSortOptions((prevOptions) => prevOptions.map((item, i) => (i === index ? option : item)))
  }, [])

  return {
    sortOptions,
    setSortOptions,
    addSortOption,
    removeSortOption,
    updateSortOption,
  }
}
