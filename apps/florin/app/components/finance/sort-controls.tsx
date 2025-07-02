import { DropdownMenuGroup } from '@radix-ui/react-dropdown-menu'
import { ListOrdered, PlusCircle } from 'lucide-react'
import { useCallback } from 'react'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import type { SortField, SortOption } from '~/lib/hooks/use-sort'
import { SortRow } from './sort-row'

interface SortControlsProps {
  value: SortOption[]
  onChange: (sortOptions: SortOption[]) => void
  open?: boolean
  onOpenChange?: (open: boolean) => void
  focusedSortIndex?: number | null
}

const sortableFields: SortField[] = ['amount', 'date', 'description', 'category']

export function SortControls({
  value: sortOptions,
  onChange,
  open,
  onOpenChange,
  focusedSortIndex,
}: SortControlsProps) {
  const availableFieldsToAdd = sortableFields.filter(
    (field) => !sortOptions.some((option) => option.field === field)
  )

  // Internal handlers that update the sort options and call onChange
  const addSortOption = useCallback(
    (option: SortOption) => {
      onChange([...sortOptions, option])
    },
    [sortOptions, onChange]
  )

  const updateSortOption = useCallback(
    (index: number, option: SortOption) => {
      const newSortOptions = [...sortOptions]
      newSortOptions[index] = option
      onChange(newSortOptions)
    },
    [sortOptions, onChange]
  )

  const removeSortOption = useCallback(
    (index: number) => {
      const newSortOptions = sortOptions.filter((_, i) => i !== index)
      onChange(newSortOptions)
    },
    [sortOptions, onChange]
  )

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <ListOrdered className="h-4 w-4 mr-2" />
          Sort
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-2 space-y-2">
        <DropdownMenuLabel>Define Sort Order</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuGroup className="space-y-1">
          {sortOptions.map((sort, index) => {
            const usedFields = sortOptions
              .filter((_, i) => i !== index)
              .map((option) => option.field)
            return (
              // Each SortRow is an item, prevent closing on interact
              <DropdownMenuItem
                key={sort.field}
                onSelect={(e) => e.preventDefault()}
                className={`focus:bg-transparent p-0 ${index === focusedSortIndex ? 'bg-accent' : ''}`}
              >
                <SortRow
                  sortOption={sort}
                  index={index}
                  sortableFields={sortableFields}
                  usedFields={usedFields}
                  updateSortOption={updateSortOption}
                  removeSortOption={removeSortOption}
                />
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
        {availableFieldsToAdd.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault() // Prevent dropdown from closing
                if (availableFieldsToAdd.length > 0) {
                  addSortOption({ field: availableFieldsToAdd[0], direction: 'desc' })
                }
              }}
              disabled={availableFieldsToAdd.length === 0}
              className="mt-1"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Sort Criterion
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
