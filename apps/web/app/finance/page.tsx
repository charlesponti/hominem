'use client'

import { DatePicker } from '@/components/form/date-picker'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useFinanceData } from '@/hooks/use-finance-data'
import { format } from 'date-fns'
import { ArrowUpDown, Download, RefreshCcw, Search } from 'lucide-react'
import { AccountsList } from '../../components/finance/accounts-list'
import { TotalBalance } from '../../components/finance/total-balance'

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
    <div className="px-4 py-6">
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
              <Button variant="outline" onClick={exportTransactions}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent>
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
                  <DatePicker
                    date={dateFrom}
                    setDate={setDateFrom}
                    placeholder="Select start date"
                  />
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
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center">Loading transactions...</div>
              ) : error ? (
                <div className="p-8 text-center text-red-500">{error}</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="p-8 text-center">No transactions found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                          <div className="flex items-center min-w-20">
                            Date
                            {sortField === 'date' && (
                              <ArrowUpDown
                                className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                              />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => handleSort('description')}
                        >
                          <div className="flex items-center">
                            Description
                            {sortField === 'description' && (
                              <ArrowUpDown
                                className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                              />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer text-right"
                          onClick={() => handleSort('amount')}
                        >
                          <div className="flex items-center justify-end">
                            Amount
                            {sortField === 'amount' && (
                              <ArrowUpDown
                                className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                              />
                            )}
                          </div>
                        </TableHead>
                        <TableHead
                          className="cursor-pointer"
                          onClick={() => handleSort('category')}
                        >
                          <div className="flex items-center">
                            Category
                            {sortField === 'category' && (
                              <ArrowUpDown
                                className={`ml-2 h-4 w-4 ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                              />
                            )}
                          </div>
                        </TableHead>
                        <TableHead>Account</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id} className="text-xs">
                          <TableCell>{format(new Date(transaction.date), 'MMM d, yyyy')}</TableCell>
                          <TableCell className="font-medium">{transaction.description}</TableCell>
                          <TableCell
                            className={`text-right font-medium ${Number.parseFloat(transaction.amount) < 0 ? 'text-red-500' : 'text-green-500'}`}
                          >
                            ${Math.abs(Number.parseFloat(transaction.amount)).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {transaction.category ? (
                              <Badge
                                variant="outline"
                                className="bg-primary text-primary-foreground line-clamp-1"
                              >
                                {transaction.category}
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground min-w-full">
                                Other
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="line-clamp-1">
                              {accountsMap.get(transaction.accountId)?.name || 'Unknown'}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between py-4 w-full">
              <div className="flex justify-center text-sm text-muted-foreground w-full">
                Showing {filteredTransactions.length} of {transactions.length} transactions
              </div>
            </CardFooter>
          </Card>
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
    </div>
  )
}
