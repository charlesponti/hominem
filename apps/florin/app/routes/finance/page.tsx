'use client'

import { AlertTriangle, Download, RefreshCcw, Search, UploadCloudIcon } from 'lucide-react'
import { useState } from 'react'
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
import { useFinanceData } from '~/lib/hooks/use-finance-data'
import { RouteLink } from '../../components/route-link'

export default function TransactionsPage() {
  const {
    accounts,
    accountsMap,
    transactions,
    loading,
    error,
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
    filteredTransactions,
    getTotalBalance,
    getRecentTransactions,
    exportTransactions,
    refreshData,
    deleteAllFinanceData,
  } = useFinanceData()
  const [showConfirm, setShowConfirm] = useState(false)

  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if clicking the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      // Set new field and default to descending
      setSortField(field)
      setSortDirection('desc')
    }
  }

  // Format total balance
  const totalBalance = getTotalBalance().toFixed(2)

  return (
    <Tabs defaultValue="transactions" className="space-y-4">
      <TabsList>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="accounts">Accounts</TabsTrigger>
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
            {transactions.length ? (
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
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.name}>
                        {account.name}
                      </SelectItem>
                    ))}
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
        <TransactionsTable
          loading={loading}
          error={error}
          transactions={transactions}
          filteredTransactions={filteredTransactions}
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

        <AccountsList
          accounts={accounts}
          loading={loading}
          error={error}
          getRecentTransactions={getRecentTransactions}
        />
      </TabsContent>
    </Tabs>
  )
}
