'use client'

import type { FinanceAccount, Transaction as FinanceTransaction } from '@hominem/utils/types'
import { format } from 'date-fns'
import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardFooter } from '~/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table'
import { cn } from '~/lib/utils'

type TransactionsTableProps = {
  loading: boolean
  error: string | null
  transactions: FinanceTransaction[]
  filteredTransactions: FinanceTransaction[]
  accountsMap: Map<string, FinanceAccount>
}

export function TransactionsTable({
  loading,
  error,
  transactions,
  filteredTransactions,
  accountsMap,
}: TransactionsTableProps) {
  return (
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
                  <TableHead>
                    <div className="flex items-center min-w-20">Date</div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">Description</div>
                  </TableHead>
                  <TableHead className="text-right">
                    <div className="flex items-center justify-end">Amount</div>
                  </TableHead>
                  <TableHead>
                    <div className="flex items-center">Category</div>
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
                      className={cn(
                        'text-right font-medium',
                        Number.parseFloat(transaction.amount) < 0
                          ? 'text-red-500'
                          : 'text-green-500'
                      )}
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
  )
}
