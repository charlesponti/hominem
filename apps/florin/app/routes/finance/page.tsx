'use client'

import type { FinanceAccount } from '@hominem/utils/types' // Add back FinanceAccount import
// Removed unused FinanceTransaction import
import { useMutation, useQueryClient } from '@tanstack/react-query' // Added for mutation
import { AlertTriangle, Download, RefreshCcw, Search, UploadCloudIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router' // Removed href import
import { AccountsList } from '~/components/finance/accounts-list'
import { TotalBalance } from '~/components/finance/total-balance'
import { TransactionsTable } from '~/components/finance/transactions-table'
import { DatePicker } from '~/components/form/date-picker'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useApiClient } from '~/lib/hooks/use-api-client' // Added for mutation
import { useFinanceAccounts, useFinanceTransactions } from '~/lib/hooks/use-finance-data' // Updated import
import { RouteLink } from '../../components/route-link'

export default function TransactionsPage() {
  const navigate = useNavigate()
  const api = useApiClient() // Added for mutation
  const queryClient = useQueryClient() // Added for mutation
  const [showConfirm, setShowConfirm] = useState(false)

  // Use the new hooks
  const {
    accounts,
    accountsMap,
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useFinanceAccounts()

  const {
    transactions, // This is now the sorted list
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
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    refetch: refetchTransactions,
    // Note: Client-side filtering logic is removed from the hook, assuming backend handles it.
    // We'll use the 'transactions' (sorted) array directly.
  } = useFinanceTransactions()

  // Combine loading and error states
  const loading = accountsLoading || transactionsLoading
  const error = accountsError || transactionsError

  // --- Re-implement helper functions and mutation ---

  // Handle sorting (now directly uses setters from useFinanceTransactions)
  // Removed duplicated handleSort function
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc') // Default to descending for new field
    }
  }

  // Calculate total balance
  const totalBalance = accounts
    .reduce((sum, account) => sum + Number.parseFloat(account.balance || '0'), 0)
    .toFixed(2)

  // Get recent transactions
  const getRecentTransactions = (accountName: string, limit = 3) => {
    // Use the 'transactions' array from the hook (already sorted by date desc by default)
    return transactions
      .filter((tx) => {
        const account = accountsMap.get(tx.accountId)
        return account?.name === accountName
      })
      .slice(0, limit)
  }

  // Export transactions as CSV
  const exportTransactions = () => {
    const headers = ['Date', 'Description', 'Amount', 'Category', 'Type', 'Account']
    const csvRows = [
      headers.join(','),
      // Use the 'transactions' array (which is sorted)
      ...transactions.map((tx) => {
        const account = accountsMap.get(tx.accountId)
        return [
          tx.date,
          `"${tx.description?.replace(/"/g, '""') || ''}"`,
          tx.amount,
          tx.category || 'Other',
          tx.type,
          account?.name || 'Unknown',
        ].join(',')
      }),
    ]
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const date = new Date().toISOString().split('T')[0]
    a.href = url
    a.download = `transactions-${date}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Refresh data
  const refreshData = async () => {
    // Refetch both accounts and transactions
    await Promise.all([refetchAccounts(), refetchTransactions()])
  }

  // Delete all finance data mutation (re-implemented here)
  const deleteAllFinanceData = useMutation({
    mutationFn: async () => {
      await api.delete('/api/finance')
    },
    onSuccess: async () => {
      // Invalidate all finance queries to force refetch
      await queryClient.invalidateQueries({ queryKey: ['finance'] })
      // Optionally trigger manual refetch if needed, though invalidation often suffices
      // await refreshData();
    },
    onError: (err) => {
      console.error('Error deleting finance data:', err)
      // Add user feedback (e.g., toast notification)
    },
  })
  // --- End of re-implemented helpers ---

  return (
    <Tabs defaultValue="transactions" className="space-y-4">
      <TabsList>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="accounts">Accounts</TabsTrigger>
        <TabsTrigger value="accounts" onClick={() => navigate('/finance/analytics')}>
          {' '}
          {/* Removed href */}
          Analytics
        </TabsTrigger>
      </TabsList>

      {/* Transactions Tab */}
      <TabsContent value="transactions" className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold">Transactions</h1>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refreshData}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {transactions && transactions.length > 0 ? ( // Check if transactions exist
              <Button variant="outline" onClick={exportTransactions}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            ) : null}
            <RouteLink to="/finance/import" className="btn bg-white">
              <UploadCloudIcon className="h-4 w-4 mr-2" />
              Import
            </RouteLink>
            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
              disabled={deleteAllFinanceData.isLoading}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Delete All Data
            </Button>
          </div>
        </div>

        {/* Confirm Delete Dialog */}
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full flex flex-col items-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
              <h2 className="text-lg font-bold mb-2 text-center">Delete all finance data?</h2>
              <p className="text-sm text-center mb-4 text-muted-foreground">
                This will permanently delete all your accounts, transactions, and budgets. This
                action cannot be undone.
              </p>
              {deleteAllFinanceData.isError && (
                <div className="text-red-600 text-sm mb-2">
                  {deleteAllFinanceData.error instanceof Error
                    ? deleteAllFinanceData.error.message
                    : 'Failed to delete data'}
                </div>
              )}
              <div className="flex gap-2 w-full">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    deleteAllFinanceData.mutate()
                    setShowConfirm(false)
                  }}
                  disabled={deleteAllFinanceData.isLoading}
                >
                  {deleteAllFinanceData.isLoading ? 'Deleting...' : 'Delete All'}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirm(false)}
                  disabled={deleteAllFinanceData.isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="py-2 px-4">
            <CardTitle className="text-md text-muted-foreground">Filters</CardTitle>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                      accounts.map(
                        (
                          account: FinanceAccount // Added type annotation
                        ) => (
                          <SelectItem key={account.id} value={account.name}>
                            {account.name}
                          </SelectItem>
                        )
                      )
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
                  value={dateFrom?.toISOString().split('T')[0]}
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
                  value={dateTo?.toISOString().split('T')[0]}
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
          </CardContent>
        </Card>

        {/* Transactions Table */}
        {/* Pass loading/error specific to transactions if needed, or combined */}
        <TransactionsTable
          loading={transactionsLoading}
          error={transactionsError instanceof Error ? transactionsError.message : null} // Pass error message
          transactions={transactions} // Pass the sorted transactions
          filteredTransactions={transactions} // Pass transactions also as filteredTransactions
          accountsMap={accountsMap}
          sortField={sortField}
          sortDirection={sortDirection}
          handleSort={handleSort}
        />
      </TabsContent>

      {/* Accounts Tab */}
      <TabsContent value="accounts" className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Accounts</h1>
          <TotalBalance balance={totalBalance} />
        </div>

        {/* Pass loading/error specific to accounts */}
        <AccountsList
          accounts={accounts}
          loading={accountsLoading}
          error={accountsError instanceof Error ? accountsError.message : null} // Pass error message
          getRecentTransactions={getRecentTransactions} // Pass the re-implemented helper
        />
      </TabsContent>
    </Tabs>
  )
}
