'use client'

import { RefreshCcw } from 'lucide-react'
import { AccountsList } from '~/components/finance/accounts-list'
import { TotalBalance } from '~/components/finance/total-balance'
import { Button } from '~/components/ui/button'
import { useFinanceAccounts, useFinanceTransactions } from '~/lib/hooks/use-finance-data'

export default function AccountsPage() {
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
    refetch: refetchTransactions,
  } = useFinanceTransactions()

  // Combine loading and error states from both hooks for simplicity in UI
  const isLoading = accountsLoading || transactionsLoading
  const combinedError = accountsError || transactionsError

  const totalBalance = accounts
    .reduce((sum, account) => sum + Number.parseFloat(account.balance || '0'), 0)
    .toFixed(2)

  const getRecentTransactions = (accountName: string, limit = 3) => {
    return transactions
      .filter((tx) => {
        const account = accountsMap.get(tx.accountId)
        return account?.name === accountName
      })
      .slice(0, limit)
  }

  const refreshData = async () => {
    await Promise.all([refetchAccounts(), refetchTransactions()])
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl font-bold">Accounts</h1>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshData} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <TotalBalance balance={totalBalance} isLoading={accountsLoading} />
        </div>
      </div>

      <AccountsList
        accounts={accounts}
        loading={isLoading}
        error={combinedError instanceof Error ? combinedError.message : null}
        getRecentTransactions={getRecentTransactions}
      />
    </div>
  )
}
