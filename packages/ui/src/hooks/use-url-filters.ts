import { useCallback, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useFilterState } from './use-filter-state'

interface UseUrlFiltersOptions<T extends Record<string, unknown>> {
  initialFilters: T
  paramMapping: Record<keyof T, string> // Map filter keys to URL param names
  onFiltersChange?: (filters: T) => void
}

export function useUrlFilters<T extends Record<string, unknown>>(options: UseUrlFiltersOptions<T>) {
  const { initialFilters, paramMapping, onFiltersChange } = options
  const [searchParams, setSearchParams] = useSearchParams()

  // Read initial filters from URL
  const urlFilters = useMemo(() => {
    const filters = { ...initialFilters }
    for (const [filterKey, paramName] of Object.entries(paramMapping)) {
      const paramValue = searchParams.get(paramName)
      if (paramValue !== null) {
        // Type assertion needed because we can't guarantee type safety at runtime
        ;(filters as Record<string, unknown>)[filterKey] = paramValue
      }
    }
    return filters as T
  }, [searchParams, initialFilters, paramMapping])

  const { filters, setFilters, updateFilter } = useFilterState({
    initialFilters: urlFilters,
    onFiltersChange: (updatedFilters) => {
      // Update URL params when filters change
      const newSearchParams = new URLSearchParams(searchParams)
      let hasChanges = false

      for (const [filterKey, paramName] of Object.entries(paramMapping)) {
        const filterValue = (updatedFilters as Record<string, unknown>)[filterKey]
        const currentParamValue = newSearchParams.get(paramName)

        if (filterValue === undefined || filterValue === null || filterValue === '') {
          // Remove param if filter is empty
          if (currentParamValue !== null) {
            newSearchParams.delete(paramName)
            hasChanges = true
          }
        } else {
          // Set param if filter has value
          const stringValue = String(filterValue)
          if (currentParamValue !== stringValue) {
            newSearchParams.set(paramName, stringValue)
            hasChanges = true
          }
        }
      }

      if (hasChanges) {
        setSearchParams(newSearchParams, { replace: true })
      }

      onFiltersChange?.(updatedFilters)
    },
  })

  // Override clearFilters to clear URL params and reset to initial filters
  const clearFilters = useCallback(() => {
    const newSearchParams = new URLSearchParams(searchParams)
    let hasChanges = false

    // Remove all mapped params from URL
    for (const paramName of Object.values(paramMapping)) {
      if (newSearchParams.has(paramName)) {
        newSearchParams.delete(paramName)
        hasChanges = true
      }
    }

    if (hasChanges) {
      setSearchParams(newSearchParams, { replace: true })
    }

    // Reset filters to initial values
    setFilters(initialFilters)
    onFiltersChange?.(initialFilters)
  }, [searchParams, setSearchParams, paramMapping, initialFilters, setFilters, onFiltersChange])

  // Sync filters when URL changes externally (e.g., browser back/forward)
  useEffect(() => {
    const currentUrlFilters = { ...initialFilters }
    for (const [filterKey, paramName] of Object.entries(paramMapping)) {
      const paramValue = searchParams.get(paramName)
      if (paramValue !== null) {
        ;(currentUrlFilters as Record<string, unknown>)[filterKey] = paramValue
      }
    }

    // Only update if URL filters differ from current filters
    const filtersChanged = Object.keys(paramMapping).some((filterKey) => {
      const urlValue = (currentUrlFilters as Record<string, unknown>)[filterKey]
      const currentValue = (filters as Record<string, unknown>)[filterKey]
      return urlValue !== currentValue
    })

    if (filtersChanged) {
      setFilters(currentUrlFilters as T)
    }
  }, [searchParams, paramMapping, initialFilters, filters, setFilters])

  return {
    filters,
    setFilters,
    updateFilter,
    clearFilters,
  }
}
