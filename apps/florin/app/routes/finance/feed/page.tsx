'use client'

import type { Transaction as FinanceTransaction } from '@hominem/utils/types'
import { format } from 'date-fns'
import { ArrowDownRight, ArrowUpRight, Calendar, ChevronRight } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { useFinanceAccounts, useFinanceTransactions } from '~/lib/hooks/use-finance-data'
import { cn } from '~/lib/utils'

export default function FinanceFeedPage() {
  const { accountsMap, isLoading: accountsLoading } = useFinanceAccounts()

  const { transactions, isLoading: transactionsLoading, error, refetch } = useFinanceTransactions()

  // Combine loading states
  const loading = accountsLoading || transactionsLoading

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Transaction Feed */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-pulse space-y-4 w-full">
              {[1, 2, 3, 4, 5].map((val) => (
                <div key={val} className="h-24 bg-gray-100 rounded-md w-full" />
              ))}
            </div>
          </div>
        ) : error ? (
          // Handle error rendering safely
          <div className="p-8 text-center text-red-500">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </div>
        ) : transactions.length === 0 ? ( // Use transactions
          <div className="p-8 text-center text-[#917C6F]">No transactions found.</div>
        ) : (
          <div className="space-y-4">
            {/* Use transactions, type is already applied */}
            {transactions.map((transaction: FinanceTransaction) => {
              const account = accountsMap.get(transaction.accountId)
              const isNegative = Number.parseFloat(transaction.amount) < 0
              const formattedDate = format(new Date(transaction.date), 'MMM d, yyyy')
              const amount = Math.abs(Number.parseFloat(transaction.amount)).toFixed(2)

              return (
                <Card
                  key={transaction.id}
                  className="overflow-hidden border-[#E8E1D9] hover:border-[#FF6600] transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4">
                    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-[#FFF8F0]">
                      {isNegative ? (
                        <ArrowUpRight className="h-6 w-6 text-[#FF6600]" />
                      ) : (
                        <ArrowDownRight className="h-6 w-6 text-[#00A878]" />
                      )}
                    </div>

                    <div className="flex-grow md:mr-10">
                      <h3 className="font-medium text-[#333333] tracking-tight line-clamp-1">
                        {transaction.description}
                      </h3>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <div className="flex items-center text-xs text-[#917C6F]">
                          <Calendar className="h-3 w-3 mr-1" />
                          {formattedDate}
                        </div>
                        <div className="flex items-center text-xs text-[#917C6F]">
                          <span className="font-light">Account:</span>
                          <span className="ml-1 font-medium">{account?.name || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 md:min-w-32">
                      <span
                        className={cn(
                          'text-lg font-light',
                          isNegative ? 'text-[#FF6600]' : 'text-[#00A878]'
                        )}
                      >
                        {isNegative ? '-' : '+'}${amount}
                      </span>

                      {transaction.category ? (
                        <Badge
                          variant="outline"
                          className="bg-[#FFF8F0] text-[#917C6F] border-[#E8E1D9] font-light"
                        >
                          {transaction.category}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="bg-[#FFF8F0] text-[#917C6F] border-[#E8E1D9] font-light"
                        >
                          Other
                        </Badge>
                      )}
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden md:flex h-8 w-8 text-[#917C6F] hover:text-[#FF6600]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        <div className="flex justify-between items-center pt-2 text-sm text-[#917C6F] font-light">
          {/* TODO: Update count display if pagination/total count is available */}
          <span>Showing {transactions.length} transactions</span>
          {transactions.length > 0 && (
            <Button variant="link" className="text-[#FF6600] font-normal p-0">
              {/* TODO: Implement "View all" or pagination controls */}
              {/* View all transactions */}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
