'use client'

import type { FinanceAccount, Transaction as FinanceTransaction } from '@hominem/utils/types'
import { format } from 'date-fns'
import { 
  Calendar,
  ChevronRight,
  CreditCard,
  DollarSign,
  Tag,
  TrendingDown,
  TrendingUp
} from 'lucide-react'
import { Card } from '~/components/ui/card'
import { cn } from '~/lib/utils'

type TransactionsListProps = {
  loading: boolean
  error: string | null
  transactions: FinanceTransaction[]
  accountsMap: Map<string, FinanceAccount>
  showCount?: boolean
}

function TransactionIcon({ transaction }: { transaction: FinanceTransaction }) {
  const isNegative = Number.parseFloat(transaction.amount) < 0
  
  if (transaction.type === 'transfer') {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-50 border border-blue-100">
        <ChevronRight className="h-5 w-5 text-blue-600" />
      </div>
    )
  }
  
  if (transaction.type === 'credit' || isNegative) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-50 border border-red-100">
        <TrendingDown className="h-5 w-5 text-red-600" />
      </div>
    )
  }
  
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 border border-emerald-100">
      <TrendingUp className="h-5 w-5 text-emerald-600" />
    </div>
  )
}

function TransactionAmount({ transaction }: { transaction: FinanceTransaction }) {
  const amount = Number.parseFloat(transaction.amount)
  const isNegative = amount < 0
  const displayAmount = Math.abs(amount).toFixed(2)
  
  return (
    <div className="text-right">
      <div className={cn(
        'text-lg font-semibold tabular-nums',
        isNegative ? 'text-red-600' : 'text-emerald-600'
      )}>
        {isNegative ? '-' : '+'}${displayAmount}
      </div>
      <div className="text-xs text-muted-foreground font-medium">
        {transaction.type.toUpperCase()}
      </div>
    </div>
  )
}

function TransactionMetadata({ 
  transaction, 
  account 
}: { 
  transaction: FinanceTransaction
  account?: FinanceAccount 
}) {
  const formattedDate = format(new Date(transaction.date), 'MMM d, yyyy')
  
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <div className="flex items-center gap-1">
        <Calendar className="h-3 w-3" />
        <span className="font-medium">{formattedDate}</span>
      </div>
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
  account 
}: { 
  transaction: FinanceTransaction
  account?: FinanceAccount 
}) {
  return (
    <Card className="group relative overflow-hidden border-0 bg-white shadow-sm ring-1 ring-gray-950/5 transition-all duration-200 hover:shadow-md hover:ring-gray-950/10">
      <div className="p-4 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Transaction Icon */}
          <TransactionIcon transaction={transaction} />
          
          {/* Main Content */}
          <div className="min-w-0 flex-1">
            {/* Description and Amount Row */}
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold text-gray-900 leading-6 truncate pr-2">
                  {transaction.description || 'Transaction'}
                </h3>
              </div>
              <TransactionAmount transaction={transaction} />
            </div>
            
            {/* Metadata Row */}
            <TransactionMetadata transaction={transaction} account={account} />
            
            {/* Hover Indicator */}
            <div className="mt-3 flex justify-end">
              <ChevronRight className="h-4 w-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

export function TransactionsList({
  loading,
  error,
  transactions,
  accountsMap,
  showCount = true,
}: TransactionsListProps) {
  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl mx-auto">
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
        <div className="text-red-600 font-medium">
          {error}
        </div>
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
          <div className="text-gray-600 font-medium">
            No transactions found
          </div>
          <div className="text-sm text-gray-500">
            Try adjusting your filters or date range
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* Count Header */}
      {showCount && (
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="text-sm text-gray-600 font-medium">
            Showing {transactions.length} transaction{transactions.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
      
      {/* Transactions List */}
      <div className="space-y-3">
        {transactions.map((transaction) => {
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
  )
}
