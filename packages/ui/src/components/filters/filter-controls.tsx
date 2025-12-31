import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'
import { type ActiveFilter, ActiveFiltersBar } from './active-filters-bar'

interface FilterControlsProps {
  children: ReactNode
  showActiveFilters?: boolean
  activeFilters?: ActiveFilter[]
  className?: string
}

export function FilterControls({
  children,
  showActiveFilters = false,
  activeFilters = [],
  className,
}: FilterControlsProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-end gap-3 flex-1">{children}</div>
      {showActiveFilters && activeFilters.length > 0 && (
        <ActiveFiltersBar filters={activeFilters} />
      )}
    </div>
  )
}
