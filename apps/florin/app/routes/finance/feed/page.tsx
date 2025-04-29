'use client'

import type { FinanceAccount, Transaction as FinanceTransaction } from '@hominem/utils/types'
import { format } from 'date-fns'
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  Download,
  RefreshCcw,
  Search,
  UploadCloudIcon,
} from 'lucide-react'
import { DatePicker } from '~/components/form/date-picker'
import { RouteLink } from '~/components/route-link'
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
// Import both hooks from the correct file
import { useFinanceAccounts, useFinanceTransactions } from '~/lib/hooks/use-finance-data'
import { cn } from '~/lib/utils'

const HermesLogo = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6 text-[#FF6600]" fill="currentColor">
    <title>Hermes Logo</title>
    <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.33l7.36 3.68-7.36 3.68L4.64 8 12 4.33zm-8 5.34l8 4v7.99l-8-4V9.67zm16 0v8l-8 4v-7.99l8-4z" />
  </svg>
)

export default function FinanceFeedPage() {
  // Get accounts data separately
  const { accounts, accountsMap, isLoading: accountsLoading } = useFinanceAccounts()

  // Get transactions data and filters/sorting/pagination state
  const {
    transactions, // Use this instead of filteredTransactions
    isLoading: transactionsLoading, // Rename to avoid conflict
    error,
    refetch, // Use this instead of refreshData
    selectedAccount,
    setSelectedAccount,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    searchQuery,
    setSearchQuery,
    sortField, // Keep sort state if needed for UI, though sorting happens in hook
    setSortField,
    sortDirection,
    setSortDirection,
    // Pagination state if needed for UI controls (not currently used)
    // limit, setLimit, offset, setOffset, page, setPage
  } = useFinanceTransactions()

  // Combine loading states
  const loading = accountsLoading || transactionsLoading

  // TODO: Implement total balance calculation if needed
  // const totalBalance = calculateTotalBalance(accounts); // Example
  const totalBalance = '0.00' // Placeholder

  // TODO: Implement export functionality if needed
  const exportTransactions = () => {
    console.warn('Export functionality not implemented yet.')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header with logo and balance */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-[#FFF8F0] p-6 rounded-md">
        <div className="flex items-center gap-3">
          <HermesLogo />
          <h1 className="text-2xl font-light tracking-tight text-[#333333]">
            Finance <span className="font-semibold">Gallerie</span>
          </h1>
        </div>

        <div className="flex flex-col items-end">
          <p className="text-sm text-[#917C6F] font-light">Total Balance</p>
          <p className="text-3xl font-light text-[#333333]">
            ${Number(totalBalance).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="border border-[#E8E1D9] shadow-none">
        <CardHeader className="py-4 px-6 border-b border-[#E8E1D9]">
          <CardTitle className="text-md font-light text-[#917C6F]">Filters</CardTitle>
        </CardHeader>
        <CardContent className="py-4 px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="account" className="text-sm font-medium mb-1 block text-[#917C6F]">
                Account
              </label>
              <Select name="account" value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger className="border-[#E8E1D9] bg-white">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {/* Type is already applied */}
                  {accounts.map((account: FinanceAccount) => (
                    <SelectItem key={account.id} value={account.name}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label htmlFor="from-date" className="text-sm font-medium mb-1 block text-[#917C6F]">
                From
              </label>
              <input
                type="text"
                id="from-date"
                className="hidden"
                value={dateFrom?.toISOString().split('T')[0]}
              />
              <DatePicker date={dateFrom} setDate={setDateFrom} placeholder="Select start date" />
            </div>

            <div>
              <label htmlFor="to-date" className="text-sm font-medium mb-1 block text-[#917C6F]">
                To
              </label>
              <input
                type="text"
                id="to-date"
                className="hidden"
                value={dateTo?.toISOString().split('T')[0]}
              />
              <DatePicker date={dateTo} setDate={setDateTo} placeholder="Select end date" />
            </div>

            <div>
              <label
                htmlFor="searchQuery"
                className="text-sm font-medium mb-1 block text-[#917C6F]"
              >
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-[#917C6F]" />
                <Input
                  name="searchQuery"
                  placeholder="Search transactions..."
                  className="pl-8 border-[#E8E1D9]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Feed */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-light text-[#333333]">Recent Transactions</h2>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-[#E8E1D9] text-[#917C6F] hover:text-[#333333]"
              onClick={() => refetch()} // Use refetch
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {transactions.length ? (
              <Button
                variant="outline"
                className="border-[#E8E1D9] text-[#917C6F] hover:text-[#333333]"
                onClick={exportTransactions}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            ) : null}
            <RouteLink
              to="/finance/import"
              className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-[#FF6600] text-white hover:bg-[#FF6600]/90 h-10 px-4 py-2"
            >
              <UploadCloudIcon className="h-4 w-4 mr-2" />
              Import
            </RouteLink>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-pulse space-y-4 w-full">
              {[1, 2, 3, 4, 5].map((val) => (
                <div key={val} className="h-24 bg-gray-100 rounded-md w-full" />
              ))}
            </div>
          </div>
        ) : error ? (
          // Handle error rendering safely
          <div className="p-8 text-center text-red-500">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </div>
        ) : transactions.length === 0 ? ( // Use transactions
          <div className="p-8 text-center text-[#917C6F]">No transactions found.</div>
        ) : (
          <div className="space-y-4">
            {/* Use transactions, type is already applied */}
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
        )}

        <div className="flex justify-between items-center pt-2 text-sm text-[#917C6F] font-light">
          {/* TODO: Update count display if pagination/total count is available */}
          <span>Showing {transactions.length} transactions</span>
          {transactions.length > 0 && (
            <Button variant="link" className="text-[#FF6600] font-normal p-0">
              {/* TODO: Implement "View all" or pagination controls */}
              {/* View all transactions */}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
