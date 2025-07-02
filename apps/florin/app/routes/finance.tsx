'use client'

import { RefreshCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { FilterChip } from '~/components/finance/filter-chip'
import { FilterControls } from '~/components/finance/filter-controls'
import { PaginationControls } from '~/components/finance/pagination-controls'
import { SortControls } from '~/components/finance/sort-controls'
import { TransactionsList } from '~/components/transactions/transactions-list'
import { Button } from '~/components/ui/button'
import { SearchInput } from '~/components/ui/search-input'
import {
  useFinanceAccountsWithMap,
  useFinanceTransactions,
  type FilterArgs,
} from '~/lib/hooks/use-finance-data'
import type { SortOption } from '~/lib/hooks/use-sort'

// Define a type for the augmented sort options
interface ActiveSortOption extends SortOption {
  onRemove: () => void
  onClick: () => void
}

export default function TransactionsPage() {
  // Local state for filters, initialized from useFinanceTransactions or default
  const [currentFilters, setCurrentFilters] = useState<FilterArgs>({})

  // Search input value - managed by SearchInput component
  const [searchValue, setSearchValue] = useState('')

  // Update current filters when search term changes
  useEffect(() => {
    setCurrentFilters((prev: FilterArgs) => ({
      ...prev,
      description: searchValue || undefined,
    }))
  }, [searchValue])

  // Use specific hooks
  const {
    accounts,
    accountsMap,
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useFinanceAccountsWithMap()

  const {
    transactions,
    sortOptions,
    addSortOption,
    updateSortOption,
    removeSortOption,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
    limit,
    page,
    setPage,
    totalTransactions,
  } = useFinanceTransactions({ filters: currentFilters })

  const [isSortControlsOpen, setIsSortControlsOpen] = useState(false)
  const [focusedSortIndex, setFocusedSortIndex] = useState<number | null>(null)

  // Create a ref for the search input
  const searchInputRef = useRef<HTMLInputElement>(null)

  const activeFilters = Object.entries(currentFilters)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => ({
      id: key,
      label: `${key.charAt(0).toUpperCase() + key.slice(1)}: ${String(value)}`,
      onRemove: () => {
        setCurrentFilters((prev: FilterArgs) => ({ ...prev, [key]: undefined }))
        if (key === 'description') {
          // Also clear the search input value when removing description filter
          setSearchValue('')
        }
      },
      onClick: () => {
        if (key === 'description') {
          // Focus the search input for description filter
          searchInputRef.current?.focus()
        }
      },
    }))

  const activeSortOptions: ActiveSortOption[] = sortOptions.map(
    (sortOption: SortOption, index: number) => ({
      ...sortOption,
      onRemove: () => removeSortOption(index),
      onClick: () => handleSortChipClick(index),
    })
  )

  const loading = accountsLoading || transactionsLoading
  const error = accountsError || transactionsError

  const refreshData = () => {
    refetchAccounts()
    refetchTransactions()
  }

  const handleSortChipClick = (index: number) => {
    setFocusedSortIndex(index)
    setIsSortControlsOpen(true)
  }

  const totalPages = limit > 0 ? Math.ceil(totalTransactions / limit) : 0

  // Memoized callback functions to prevent unnecessary re-renders
  const handleSelectedAccountChange = useCallback((accountId: string) => {
    setCurrentFilters((prev: FilterArgs) => ({
      ...prev,
      accountId: accountId === 'all' ? undefined : accountId,
    }))
  }, [])

  const handleDateFromChange = useCallback((date: Date | undefined) => {
    setCurrentFilters((prev: FilterArgs) => ({
      ...prev,
      dateFrom: date,
    }))
  }, [])

  const handleDateToChange = useCallback((date: Date | undefined) => {
    setCurrentFilters((prev: FilterArgs) => ({
      ...prev,
      dateTo: date,
    }))
  }, [])

  const handleSearchQueryChange = useCallback((description: string) => {
    setSearchValue(description)
  }, [])

  const handleSortControlsOpenChange = useCallback((open: boolean) => {
    setIsSortControlsOpen(open)
    if (!open) {
      setFocusedSortIndex(null)
    }
  }, [])

  return (
    <>
      <header className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Transactions</h2>

        {/* Search Input */}
        <SearchInput
          ref={searchInputRef}
          value={searchValue}
          onSearchChange={handleSearchQueryChange}
          placeholder="Search transactions..."
          className="mb-4 max-w-md"
        />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap gap-2">
            <FilterControls
              accounts={accounts || []}
              accountsLoading={accountsLoading}
              selectedAccount={currentFilters.accountId || 'all'}
              setSelectedAccount={handleSelectedAccountChange}
              dateFrom={currentFilters.dateFrom ? new Date(currentFilters.dateFrom) : undefined}
              setDateFrom={handleDateFromChange}
              dateTo={currentFilters.dateTo ? new Date(currentFilters.dateTo) : undefined}
              setDateTo={handleDateToChange}
            />
            <SortControls
              sortOptions={sortOptions || []}
              addSortOption={addSortOption}
              updateSortOption={updateSortOption}
              removeSortOption={removeSortOption}
              open={isSortControlsOpen}
              onOpenChange={handleSortControlsOpenChange}
              focusedSortIndex={focusedSortIndex}
            />
            <Button variant="outline" onClick={refreshData} disabled={loading}>
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
          {activeSortOptions.map(
            (
              sort: ActiveSortOption // Used ActiveSortOption type
            ) => (
              <FilterChip
                key={`sort-${sort.field}`}
                label={`Sort by ${sort.field} (${sort.direction})`}
                onRemove={sort.onRemove}
                onClick={sort.onClick}
              />
            )
          )}
        </div>
      )}

      {/* Shared Loading, Error, and Empty States */}
      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-pulse space-y-4 w-full">
            {[1, 2, 3, 4, 5].map((val) => (
              <div key={val} className="h-24 bg-gray-100 rounded-md w-full md:h-12" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">
          {typeof error === 'string'
            ? error
            : error instanceof Error
              ? error.message
              : 'An unknown error occurred'}
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-8 text-center text-[#917C6F]">No transactions found.</div>
      ) : (
        <>
          <TransactionsList
            loading={transactionsLoading}
            error={transactionsError}
            transactions={transactions}
            accountsMap={accountsMap}
          />

          <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </>
  )
}
