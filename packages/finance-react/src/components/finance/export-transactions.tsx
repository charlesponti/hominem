import { toast } from '@hominem/ui'
import { Button } from '@hominem/ui/button'

import { useFinanceAccounts, useFinanceTransactions } from '../../hooks/use-finance-data'

export function ExportTransactions() {
  const { accountsMap } = useFinanceAccounts()
  const { transactions: rawTransactions } = useFinanceTransactions()
  const transactions = Array.isArray(rawTransactions) ? rawTransactions : []

  const handleExport = () => {
    if (!transactions || transactions.length === 0) {
      toast({
        title: 'No Transactions',
        description: 'There are no transactions to export.',
        variant: 'default',
      })
      return
    }

    const headers = ['Date', 'Description', 'Amount', 'Category', 'Type', 'Account']
    const csvRows = [
      headers.join(','),
      ...transactions.map((tx) => {
        const account = accountsMap.get(tx.accountId)
        return [
          tx.date,
          `"${tx.description?.replace(/"/g, '""') || ''}"`,
          String(tx.amount),
          'Uncategorized',
          tx.type || 'expense',
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

    toast({
      title: 'Export Complete',
      description: `Exported ${transactions.length} transactions.`,
    })
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      Export CSV
    </Button>
  )
}
