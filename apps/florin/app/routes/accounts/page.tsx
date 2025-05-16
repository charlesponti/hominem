'use client'

import { RefreshCcw } from 'lucide-react'
import { AccountsList } from '~/components/finance/accounts-list'
import { Button } from '~/components/ui/button'
import { useFinanceAccountSummary } from '~/lib/hooks/use-finance-data'

export default function AccountsPage() {
  const {
    accountSummary,
    isLoading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
  } = useFinanceAccountSummary()

  const isLoading = summaryLoading
  const combinedError = summaryError

  const refreshData = async () => {
    await refetchSummary()
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
        </div>
      </div>

      <AccountsList
        accounts={accountSummary}
        loading={isLoading}
        error={combinedError instanceof Error ? combinedError.message : null}
      />
    </div>
  )
}
