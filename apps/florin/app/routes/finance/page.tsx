'use client'

import type { FinanceAccount } from '@hominem/utils/types'
import { PlusCircle, RefreshCcw, Search } from 'lucide-react'
import { DatePicker } from '~/components/date-picker'
import { SortRow } from '~/components/finance/sort-row'
import { TransactionsList } from '~/components/finance/transactions-list'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import type { SortField } from '~/lib/hooks/use-finance-data'
import { useFinanceAccounts, useFinanceTransactions } from '~/lib/hooks/use-finance-data'

interface PaginationControlsProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  totalItems: number
  itemsPerPage: number
}

function PaginationControls({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
}: PaginationControlsProps) {
  if (totalItems === 0 || totalPages <= 1) {
    return null
  }

  const itemsOnCurrentPage = Math.min(itemsPerPage, totalItems - currentPage * itemsPerPage)

  return (
    <div className="flex justify-between items-center pt-2 text-sm text-[#917C6F] font-light">
      <span>
        Showing {itemsOnCurrentPage} of {totalItems} transactions
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 0}
        >
          Previous
        </Button>
        <span>
          Page {currentPage + 1} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage + 1 >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  )
}

export default function TransactionsPage() {
  const {
    accounts,
    accountsMap,
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useFinanceAccounts()

  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    selectedAccount,
    setSelectedAccount,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchQuery,
    setSearchQuery,
    sortOptions, // This will be an array of SortOption
    addSortOption, // Function to add a sort criterion
    removeSortOption, // Function to remove a sort criterion
    updateSortOption, // Function to update an existing sort criterion
    refetch: refetchTransactions,
    // Pagination
    page,
    setPage,
    limit,
    filteredTransactionCount, // Updated from totalTransactions
    totalUserTransactionCount, // Available if needed, but not directly for pagination of filtered results
  } = useFinanceTransactions()

  const loading = accountsLoading || transactionsLoading
  const error = accountsError || transactionsError

  const refreshData = async () => {
    await Promise.all([refetchAccounts(), refetchTransactions()])
  }

  const totalPages = Math.ceil(filteredTransactionCount / limit) // Use filteredTransactionCount

  const allSortableFields: SortField[] = ['date', 'description', 'amount', 'category']
  const availableFieldsToAdd = allSortableFields.filter(
    (field) => !sortOptions.some((option) => option.field === field)
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshData}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters - Shared across resolutions */}
      <Card>
        <CardHeader className="py-2 px-4">
          <CardTitle className="text-md text-muted-foreground">Filters</CardTitle>
        </CardHeader>
        <CardContent className="py-2 px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="account" className="text-sm font-medium mb-1 block">
                Account
              </label>
              <Select name="account" value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {accountsLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading accounts...
                    </SelectItem>
                  ) : (
                    accounts.map((account: FinanceAccount) => (
                      <SelectItem key={account.id} value={account.name}>
                        {account.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="from-date" className="text-sm font-medium mb-1 block">
                From Date
              </label>
              <input
                type="text"
                id="from-date"
                className="hidden"
                value={dateFrom?.toISOString().split('T')[0] || ''}
                readOnly
              />
              <DatePicker date={dateFrom} setDate={setDateFrom} placeholder="Select start date" />
            </div>

            <div>
              <label htmlFor="to-date" className="text-sm font-medium mb-1 block">
                To Date
              </label>
              <input
                type="text"
                id="to-date"
                className="hidden"
                value={dateTo?.toISOString().split('T')[0] || ''}
                readOnly
              />
              <DatePicker date={dateTo} setDate={setDateTo} placeholder="Select end date" />
            </div>

            <div>
              <label htmlFor="searchQuery" className="text-sm font-medium mb-1 block">
                Description
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="searchQuery"
                  placeholder="Search..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 py-2 border-t border-gray-200">
            <div className="flex flex-wrap items-center gap-4">
              <h3 className="text-sm font-medium">Sort By</h3>
              {sortOptions.map((sort, index) => {
                const usedFields = sortOptions
                  .filter((_, i) => i !== index) // Get fields used by *other* sort options
                  .map((option) => option.field)

                return (
                  <SortRow
                    key={sort.field} // It's good practice to ensure this key is stable and unique
                    sortOption={sort}
                    index={index}
                    allSortableFields={allSortableFields}
                    usedFields={usedFields}
                    updateSortOption={updateSortOption}
                    removeSortOption={removeSortOption}
                  />
                )
              })}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (availableFieldsToAdd.length > 0) {
                    addSortOption({ field: availableFieldsToAdd[0], direction: 'desc' })
                  }
                }}
                disabled={availableFieldsToAdd.length === 0}
              >
                <PlusCircle className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
          {error instanceof Error ? error.message : 'An unknown error occurred'}
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-8 text-center text-[#917C6F]">No transactions found.</div>
      ) : (
        <>
          {/* Modern Transactions List - Responsive across all screen sizes */}
          <TransactionsList
            loading={false}
            error={null}
            transactions={transactions}
            accountsMap={accountsMap}
            showCount={true}
          />

          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            totalItems={filteredTransactionCount}
            itemsPerPage={limit}
          />
        </>
      )}
    </div>
  )
}
