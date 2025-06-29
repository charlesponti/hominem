'use client'

import { ArrowLeft, Building2, CreditCard, Eye, EyeOff, RefreshCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import {
  AccountConnectionDialog,
  AccountSpendingChart,
  ManualAccountStatus,
  PlaidConnectionStatus
} from '~/components/accounts'
import { RouteLink } from '~/components/route-link'
import { TransactionsList } from '~/components/transactions/transactions-list'
import { Alert, AlertDescription, AlertTitle } from '~/components/ui/alert'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { useAllAccounts, useFinanceTransactions } from '~/lib/hooks/use-finance-data'

export default function AccountDetailsPage() {
  const { id } = useParams() as { id: string }
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)

  // Get account details
  const {
    accounts,
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useAllAccounts()

  // Create accounts map for TransactionsList component
  const accountsMap = useMemo(() => {
    return new Map(
      accounts.map((account) => [
        account.id,
        {
          ...account,
          createdAt: new Date(account.createdAt),
          updatedAt: new Date(account.updatedAt),
          lastUpdated: account.lastUpdated ? new Date(account.lastUpdated) : null,
        }
      ])
    )
  }, [accounts])

  // Get transactions for this specific account
  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
    totalTransactions,
  } = useFinanceTransactions({
    filters: { accountId: id },
    initialLimit: 50,
  })

  const account = accounts.find((acc) => acc.id === id)
  const isLoading = accountsLoading || transactionsLoading
  const hasError = accountsError || transactionsError

  const refreshData = async () => {
    await Promise.all([refetchAccounts(), refetchTransactions()])
  }

  const getAccountTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return <CreditCard className="h-6 w-6" />
      default:
        return <Building2 className="h-6 w-6" />
    }
  }

  const formatBalance = (balance: string) => {
    const amount = Number.parseFloat(balance)
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getAccountTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'credit':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'depository':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'investment':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'loan':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <RefreshCcw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Loading account details...</p>
        </div>
      </div>
    )
  }

  if (hasError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Account</AlertTitle>
        <AlertDescription>
          {accountsError instanceof Error
            ? accountsError.message
            : transactionsError instanceof Error
              ? transactionsError.message
              : 'Failed to load account data'}
        </AlertDescription>
      </Alert>
    )
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" asChild>
            <RouteLink to="/accounts">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Accounts
            </RouteLink>
          </Button>
        </div>

        <Alert>
          <AlertTitle>Account Not Found</AlertTitle>
          <AlertDescription>
            The account you're looking for doesn't exist or has been removed.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const isPlaidAccount = account.isPlaidConnected || false

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" className="flex items-center gap-1" asChild>
          <RouteLink to="/accounts">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accounts
          </RouteLink>
        </Button>
        <Button variant="outline" onClick={refreshData} disabled={isLoading}>
          <RefreshCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Account Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-muted rounded-lg">{getAccountTypeIcon(account.type)}</div>
              <div>
                <CardTitle className="text-xl">{account.name}</CardTitle>
                <CardDescription className="flex items-center space-x-2">
                  <Badge variant="outline" className={getAccountTypeColor(account.type)}>
                    {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
                  </Badge>
                  {isPlaidAccount && <Badge variant="secondary">Connected via Plaid</Badge>}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Balance for Plaid accounts */}
          {isPlaidAccount && account.balance && (
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Current Balance:</span>
                <span className="text-2xl font-bold">
                  {isBalanceVisible ? formatBalance(account.balance) : '••••••'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsBalanceVisible(!isBalanceVisible)}
              >
                {isBalanceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          )}

          {/* Connection Management Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Connection Management</h3>
              <AccountConnectionDialog
                account={account}
                trigger={
                  <Button variant="outline" size="sm">
                    Manage Connection
                  </Button>
                }
              />
            </div>

            {/* Connection Status */}
            {isPlaidAccount ? (
              <PlaidConnectionStatus account={account} onRefresh={refreshData} />
            ) : (
              <ManualAccountStatus account={account} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Spending Chart */}
      <AccountSpendingChart accountId={id} accountName={account.name} />

      {/* Transactions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Transactions</h2>
          <Badge variant="secondary">{totalTransactions} total</Badge>
        </div>

        <TransactionsList
          loading={transactionsLoading}
          error={transactionsError}
          transactions={transactions}
          accountsMap={accountsMap}
        />
      </div>
    </div>
  )
}
