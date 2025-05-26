import type { FinanceAccount, Transaction } from '@hominem/utils/types'
import { AccountConnectionStatus } from '~/components/accounts/account-connection-status'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'

interface AccountCardProps {
  account: FinanceAccount
  recentTransactions: Transaction[]
}

export function AccountCard({ account, recentTransactions }: AccountCardProps) {
  return (
    <Card className="overflow-hidden flex flex-col">
      <CardHeader className="pb-3">
        <CardTitle>{account.name}</CardTitle>
        <CardDescription>
          {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="flex justify-between text-sm">
                <span className="truncate max-w-[180px]">{tx.description}</span>
                <span
                  className={Number.parseFloat(tx.amount) < 0 ? 'text-red-500' : 'text-green-500'}
                >
                  ${Math.abs(Number.parseFloat(tx.amount)).toFixed(2)}
                </span>
              </div>
            ))}
            {recentTransactions.length === 0 && (
              <div className="text-gray-500 text-sm">No recent transactions</div>
            )}
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 p-3">
        <AccountConnectionStatus account={account} />
      </CardFooter>
    </Card>
  )
}
