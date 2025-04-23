'use client'

import { AccountsList } from '@/components/finance/accounts-list'
import { TotalBalance } from '@/components/finance/total-balance'
import { TransactionsTable } from '@/components/finance/transactions-table'
import { DatePicker } from '@/components/form/date-picker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFinanceData } from '@/hooks/use-finance-data'
import { Download, RefreshCcw, Search, UploadCloudIcon } from 'lucide-react'
import Link from 'next/link'

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
  } = useFinanceData()

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
            <Link href="/finance/import" className="btn bg-white">
              <UploadCloudIcon className="h-4 w-4 mr-2" />
              Import
            </Link>
          </div>
        </div>

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
