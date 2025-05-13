'use client'

import type { FinanceAccount } from '@hominem/utils/types'
import { RefreshCcw, Search } from 'lucide-react'
import { useNavigate } from 'react-router'
import { DatePicker } from '~/components/date-picker'
import { TransactionsTable } from '~/components/finance/transactions-table'
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
import { useFinanceAccounts, useFinanceTransactions } from '~/lib/hooks/use-finance-data'

export default function TransactionsPage() {
  const navigate = useNavigate()

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
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    refetch: refetchTransactions,
  } = useFinanceTransactions()

  const loading = accountsLoading || transactionsLoading
  const error = accountsError || transactionsError

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const refreshData = async () => {
    await Promise.all([refetchAccounts(), refetchTransactions()])
  }

  return (
    <Tabs defaultValue="transactions" className="space-y-4">
      <TabsList>
        <TabsTrigger value="transactions">Transactions</TabsTrigger>
        <TabsTrigger value="analytics" onClick={() => navigate('/finance/analytics')}>
          Analytics
        </TabsTrigger>
      </TabsList>

      <TabsContent value="transactions" className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold">Transactions</h1>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={refreshData}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

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
          </CardContent>
        </Card>

        <TransactionsTable
          loading={transactionsLoading}
          error={transactionsError instanceof Error ? transactionsError.message : null}
          transactions={transactions}
          filteredTransactions={transactions}
          accountsMap={accountsMap}
          sortField={sortField}
          sortDirection={sortDirection}
          handleSort={handleSort}
        />
      </TabsContent>
    </Tabs>
  )
}
