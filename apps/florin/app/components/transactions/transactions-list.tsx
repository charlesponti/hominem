import { format } from 'date-fns'
import { Calendar, CreditCard, DollarSign, Tag } from 'lucide-react'
import { Card } from '~/components/ui/card'
import type {
  useFinanceAccountsWithMap,
  useFinanceTransactions,
} from '~/lib/hooks/use-finance-data'
import { cn } from '~/lib/utils'

// Use the actual tRPC return type
type TransactionFromAPI = ReturnType<typeof useFinanceTransactions>['transactions'][number]
type AccountsMap = ReturnType<typeof useFinanceAccountsWithMap>['accountsMap']
type AccountFromMap = NonNullable<AccountsMap> extends Map<string, infer T> ? T : never

type TransactionsListProps = {
  loading: boolean
  error: string | null
  transactions: TransactionFromAPI[]
  accountsMap: AccountsMap
}

function TransactionAmount({ transaction }: { transaction: TransactionFromAPI }) {
  const amount = Number.parseFloat(transaction.amount)
  const isNegative = amount < 0
  const displayAmount = Math.abs(amount).toFixed(2)

  return (
    <div className="text-right">
      <div
        className={cn(
          'text-lg font-semibold tabular-nums',
          isNegative ? 'text-red-600' : 'text-emerald-600'
        )}
      >
        ${displayAmount}
      </div>
    </div>
  )
}

function TransactionMetadata({
  transaction,
  account,
}: {
  transaction: TransactionFromAPI
  account?: AccountFromMap
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      {account && (
        <div className="flex items-center gap-1">
          <CreditCard className="h-3 w-3" />
          <span className="font-medium truncate max-w-[120px]">{account.name}</span>
        </div>
      )}
      {transaction.category && (
        <div className="flex items-center gap-1">
          <Tag className="h-3 w-3" />
          <span className="font-medium">{transaction.category}</span>
        </div>
      )}
    </div>
  )
}

function TransactionListItem({
  transaction,
  account,
}: {
  transaction: TransactionFromAPI
  account?: AccountFromMap
}) {
  return (
    <Card className="group px-2 py-2">
      <div className="w-full flex items-center justify-between gap-4">
        <h3 className="font-serif text-black tracking-tight">
          {transaction.description || 'Transaction'}
        </h3>
        <TransactionAmount transaction={transaction} />
      </div>
      <TransactionMetadata transaction={transaction} account={account} />
    </Card>
  )
}

function DateGroupHeader({ date }: { date: string }) {
  const formattedDate = format(new Date(date), 'EEEE, MMMM d, yyyy')

  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-muted-foreground" />
      <h2 className="text-sm font-medium text-muted-foreground">{formattedDate}</h2>
    </div>
  )
}

export function TransactionsList({
  loading,
  error,
  transactions,
  accountsMap,
}: TransactionsListProps) {
  if (loading) {
    return (
      <div className="space-y-4 mx-auto">
        {Array.from({ length: 5 }, (_, i) => `skeleton-${Date.now()}-${i}`).map((key) => (
          <Card key={key} className="p-4 sm:p-6 animate-pulse">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-4 bg-gray-200 rounded w-16" />
                </div>
                <div className="flex gap-4">
                  <div className="h-3 bg-gray-100 rounded w-20" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <Card className="p-8 text-center border-red-200 bg-red-50 max-w-4xl mx-auto">
        <div className="text-red-600 font-medium">{error}</div>
      </Card>
    )
  }

  if (transactions.length === 0) {
    return (
      <Card className="p-8 text-center border-gray-200 bg-gray-50 max-w-4xl mx-auto">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-gray-400" />
          </div>
          <div className="text-gray-600 font-medium">No transactions found</div>
          <div className="text-sm text-gray-500">Try adjusting your filters or date range</div>
        </div>
      </Card>
    )
  }

  // Group transactions by date
  const groupedTransactions = transactions.reduce(
    (groups, transaction) => {
      const date = transaction.date
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(transaction)
      return groups
    },
    {} as Record<string, TransactionFromAPI[]>
  )

  // Sort dates in descending order (most recent first)
  const sortedDates = Object.keys(groupedTransactions).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  )

  return (
    <div className="space-y-6 mx-auto">
      {sortedDates.map((date) => (
        <div key={date} className="space-y-1">
          <DateGroupHeader date={date} />
          <div className="space-y-3">
            {groupedTransactions[date].map((transaction) => {
              const account = accountsMap.get(transaction.accountId)
              return (
                <TransactionListItem
                  key={transaction.id}
                  transaction={transaction}
                  account={account}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
