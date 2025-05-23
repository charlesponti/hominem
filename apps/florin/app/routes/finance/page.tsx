'use client'

import type { FinanceAccount, Transaction as FinanceTransaction } from '@hominem/utils/types'
import { format } from 'date-fns'
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  RefreshCcw,
  Search,
} from 'lucide-react'
import { DatePicker } from '~/components/date-picker'
import { SortRow } from '~/components/finance/sort-row'
import { TransactionsTable } from '~/components/finance/transactions-table'
import { Badge } from '~/components/ui/badge'
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
import { cn } from '~/lib/utils'

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
          {/* Add Sort Controls UI */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-medium">Sort By</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (availableFieldsToAdd.length > 0) {
                    addSortOption({ field: availableFieldsToAdd[0], direction: 'desc' })
                  }
                }}
                disabled={availableFieldsToAdd.length === 0}
              >
                Add Sort
              </Button>
            </div>
            <div className="flex flex-wrap gap-4">
              {' '}
              {/* Changed to flex-wrap and gap-4 */}
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
          {/* Mobile View: Feed Layout */}
          <div data-testid="transactions-feed" className="md:hidden space-y-4">
            {transactions.map((transaction: FinanceTransaction) => {
              const account = accountsMap.get(transaction.accountId)
              const isNegative = Number.parseFloat(transaction.amount) < 0
              const formattedDate = format(new Date(transaction.date), 'MMM d, yyyy')
              const amount = Math.abs(Number.parseFloat(transaction.amount)).toFixed(2)

              return (
                <Card
                  key={transaction.id}
                  className="overflow-hidden border-[#E8E1D9] hover:border-[#FF6600] transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4">
                    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-[#FFF8F0]">
                      {isNegative ? (
                        <ArrowUpRight className="h-6 w-6 text-[#FF6600]" />
                      ) : (
                        <ArrowDownRight className="h-6 w-6 text-[#00A878]" />
                      )}
                    </div>

                    <div className="flex-grow md:mr-10">
                      <h3 className="font-medium text-[#333333] tracking-tight line-clamp-1">
                        {transaction.description}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <div className="flex items-center text-xs text-[#917C6F]">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formattedDate}
                        </div>
                        <div className="flex items-center text-xs text-[#917C6F]">
                          <span className="font-light">Account:</span>
                          <span className="ml-1 font-medium">{account?.name || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 md:min-w-32">
                      <span
                        className={cn(
                          'text-lg font-light',
                          isNegative ? 'text-[#FF6600]' : 'text-[#00A878]'
                        )}
                      >
                        {isNegative ? '-' : '+'}${amount}
                      </span>

                      {transaction.category ? (
                        <Badge
                          variant="outline"
                          className="bg-[#FFF8F0] text-[#917C6F] border-[#E8E1D9] font-light"
                        >
                          {transaction.category}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-[#FFF8F0] text-[#917C6F] border-[#E8E1D9] font-light"
                        >
                          Other
                        </Badge>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden md:flex h-8 w-8 text-[#917C6F] hover:text-[#FF6600]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>

          {/* Desktop View: Table Layout */}
          <div className="hidden md:block space-y-4">
            <TransactionsTable
              loading={false}
              error={null}
              transactions={transactions}
              filteredTransactions={transactions}
              accountsMap={accountsMap}
            />
          </div>

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
