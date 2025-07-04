import { ListFilter, RefreshCcw } from 'lucide-react'
import { useCallback, useMemo, useRef, useState } from 'react'
import { AccountSelect } from '~/components/account-select'
import { DatePicker } from '~/components/date-picker'
import { FilterChip } from '~/components/finance/filter-chip'
import { SortControls } from '~/components/finance/sort-controls'
import { Button } from '~/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu'
import { SearchInput } from '~/components/ui/search-input'
import type { FilterArgs, useFinanceAccountsWithMap } from '~/lib/hooks/use-finance-data'
import { useSelectedAccount } from '~/lib/hooks/use-selected-account'
import type { SortOption } from '~/lib/hooks/use-sort'

interface ActiveSortOption extends SortOption {
  onRemove: () => void
  onClick: () => void
}

interface TransactionFiltersProps {
  accountsMap: Map<string, ReturnType<typeof useFinanceAccountsWithMap>['accounts'][number]>
  accountsLoading: boolean

  // Filters state
  filters: FilterArgs
  onFiltersChange: (filters: FilterArgs) => void

  // Search state
  searchValue: string
  onSearchChange: (value: string) => void

  // Sort state
  sortOptions: SortOption[]
  onSortOptionsChange: (sortOptions: SortOption[]) => void

  // Actions
  onRefresh: () => void
  loading?: boolean
}

export function TransactionFilters({
  accountsMap,
  accountsLoading,
  filters,
  onFiltersChange,
  searchValue,
  onSearchChange,
  sortOptions,
  onSortOptionsChange,
  onRefresh,
  loading = false,
}: TransactionFiltersProps) {
  const { selectedAccount, setSelectedAccount } = useSelectedAccount()
  const [isFilterControlsOpen, setIsFilterControlsOpen] = useState(false)
  const [isSortControlsOpen, setIsSortControlsOpen] = useState(false)
  const [focusedSortIndex, setFocusedSortIndex] = useState<number | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Optimize account lookup with memoized account names map
  const accountNames = useMemo(() => {
    const names = new Map<string, string>()
    accountsMap.forEach((account, id) => {
      names.set(id, account.name)
    })
    return names
  }, [accountsMap])

  // Create filters object that includes the selected account
  const allFilters = useMemo(
    () => ({
      ...filters,
      accountId: selectedAccount === 'all' ? undefined : selectedAccount,
    }),
    [filters, selectedAccount]
  )

  // Handle account selection
  const handleSelectedAccountChange = useCallback(
    (accountId: string) => {
      setSelectedAccount(accountId)
    },
    [setSelectedAccount]
  )

  // Handle date changes
  const handleDateFromChange = useCallback(
    (date: Date | undefined) => {
      onFiltersChange({
        ...filters,
        dateFrom: date,
      })
    },
    [filters, onFiltersChange]
  )

  const handleDateToChange = useCallback(
    (date: Date | undefined) => {
      onFiltersChange({
        ...filters,
        dateTo: date,
      })
    },
    [filters, onFiltersChange]
  )

  const handleSortControlsOpenChange = useCallback((open: boolean) => {
    setIsSortControlsOpen(open)
    if (!open) {
      setFocusedSortIndex(null)
    }
  }, [])

  const handleSortChipClick = useCallback((index: number) => {
    setFocusedSortIndex(index)
    setIsSortControlsOpen(true)
  }, [])

  const handleRefresh = useCallback(() => {
    onRefresh()
  }, [onRefresh])

  const activeFilters = useMemo(() => {
    return Object.entries(allFilters)
      .filter(([, value]) => value !== undefined && value !== '')
      .map(([key, value]) => {
        // Handle special cases for different filter types
        let displayValue = String(value)
        let displayKey = key.charAt(0).toUpperCase() + key.slice(1)

        // For accountId, show the account name instead of the ID (optimized lookup)
        if (key === 'accountId' && value && typeof value === 'string') {
          displayValue = accountNames.get(value) || value
          displayKey = 'Account'
        }

        // For date filters, format the date nicely
        if ((key === 'dateFrom' || key === 'dateTo') && value) {
          try {
            const date = value instanceof Date ? value : new Date(String(value))
            displayValue = date.toLocaleDateString()
            displayKey = key === 'dateFrom' ? 'From Date' : 'To Date'
          } catch {
            // Keep original value if date parsing fails
          }
        }

        return {
          id: key,
          label: `${displayKey}: ${displayValue}`,
          onRemove: () => {
            if (key === 'accountId') {
              // Clear the selected account when removing account filter
              setSelectedAccount('all')
            } else {
              // For other filters, update filters
              onFiltersChange({
                ...filters,
                [key]: undefined,
              })
              if (key === 'description') {
                // Also clear the search input value when removing description filter
                onSearchChange('')
              }
            }
          },
          onClick: () => {
            if (key === 'description') {
              // Focus the search input for description filter
              searchInputRef.current?.focus()
            }
            if (key === 'accountId') {
              // Could be enhanced to open filter controls and focus account selector
            }
          },
        }
      })
  }, [allFilters, accountNames, filters, onFiltersChange, onSearchChange, setSelectedAccount])

  // Generate active sort option chips with memoization
  const activeSortOptions: ActiveSortOption[] = useMemo(() => {
    return sortOptions.map((sortOption: SortOption, index: number) => ({
      ...sortOption,
      onRemove: () => {
        const newSortOptions = sortOptions.filter((_, i) => i !== index)
        onSortOptionsChange(newSortOptions)
      },
      onClick: () => handleSortChipClick(index),
    }))
  }, [sortOptions, onSortOptionsChange, handleSortChipClick])

  return (
    <>
      <header className="mb-6">
        <SearchInput
          ref={searchInputRef}
          value={searchValue}
          onSearchChange={onSearchChange}
          placeholder="Search transactions..."
          className="mb-4 max-w-md"
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <DropdownMenu open={isFilterControlsOpen} onOpenChange={setIsFilterControlsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <ListFilter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-2 space-y-2">
                <DropdownMenuLabel>Apply Filters</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Account Filter */}
                <AccountSelect
                  selectedAccount={selectedAccount}
                  onAccountChange={handleSelectedAccountChange}
                  isLoading={accountsLoading}
                  showLabel={true}
                  label="Account"
                />

                {/* Date From Filter */}
                <div className="space-y-1">
                  <label htmlFor="from-date-filter" className="text-sm font-medium">
                    From Date
                  </label>
                  <DatePicker
                    date={filters.dateFrom}
                    setDate={handleDateFromChange}
                    placeholder="Start date"
                  />
                </div>

                {/* Date To Filter */}
                <div className="space-y-1">
                  <label htmlFor="to-date-filter" className="text-sm font-medium">
                    To Date
                  </label>
                  <DatePicker
                    date={filters.dateTo}
                    setDate={handleDateToChange}
                    placeholder="End date"
                  />
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
            <SortControls
              value={sortOptions || []}
              onChange={onSortOptionsChange}
              open={isSortControlsOpen}
              onOpenChange={handleSortControlsOpenChange}
              focusedSortIndex={focusedSortIndex}
            />
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Active Filters and Sorts Display */}
      {(activeFilters.length > 0 || activeSortOptions.length > 0) && (
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <span className="text-sm text-muted-foreground">Active criteria:</span>
          {activeFilters.map((filter) => (
            <FilterChip
              key={filter.id}
              label={filter.label}
              onRemove={filter.onRemove}
              onClick={filter.onClick}
            />
          ))}
          {activeSortOptions.map((sort: ActiveSortOption) => (
            <FilterChip
              key={`sort-${sort.field}`}
              label={`Sort by ${sort.field} (${sort.direction})`}
              onRemove={sort.onRemove}
              onClick={sort.onClick}
            />
          ))}
        </div>
      )}
    </>
  )
}
