import { Button } from '@hominem/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@hominem/ui/components/ui/alert'
import { Badge } from '@hominem/ui/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card'
import { ArrowLeft, RefreshCcw } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useParams } from 'react-router'
import { AccountHeader } from '~/components/accounts/account-header'
import { AccountSpendingChart } from '~/components/accounts/account-spending-chart'
import { RouteLink } from '~/components/route-link'
import { TransactionsList } from '~/components/transactions/transactions-list'
import { useAccountById, useFinanceTransactions } from '~/lib/hooks/use-finance-data'

export default function AccountDetailsPage() {
  const { id } = useParams() as { id: string }
  const [isBalanceVisible, setIsBalanceVisible] = useState(true)

  // Get account details
  const {
    account,
    isLoading: accountLoading,
    error: accountError,
    refetch: refetchAccount,
  } = useAccountById(id)

  // Create a map with a single account for the TransactionsList component
  const accountsMap = useMemo(() => {
    if (!account) return new Map()
    return new Map([[account.id, account]])
  }, [account])

  // Get transactions for this specific account
  const {
    transactions,
    isLoading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
    totalTransactions,
  } = useFinanceTransactions({
    filters: { accountId: id },
    limit: 50,
  })

  const isLoading = accountLoading || transactionsLoading
  const hasError = accountError || transactionsError

  const refreshData = async () => {
    await Promise.all([refetchAccount(), refetchTransactions()])
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <RefreshCcw className="size-8 animate-spin mx-auto text-muted-foreground" />
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
          {accountError instanceof Error
            ? accountError.message
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
              <ArrowLeft className="size-4 mr-2" />
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

  return (
    <div className="space-y-6">
      <AccountHeader
        account={account}
        isBalanceVisible={isBalanceVisible}
        onToggleBalance={() => setIsBalanceVisible(!isBalanceVisible)}
        onRefresh={refreshData}
        isLoading={isLoading}
      />

      {/* Monthly Spending Chart */}
      {!account ? (
        <Card>
          <CardHeader>
            <CardTitle>Monthly Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80 w-full flex items-center justify-center">
              <div className="text-muted-foreground">No account selected</div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <AccountSpendingChart accountId={id} accountName={account.name} />
      )}

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
