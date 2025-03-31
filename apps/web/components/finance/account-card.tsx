import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import type { FinanceData } from '@/hooks/use-finance-data'

interface AccountCardProps {
  account: FinanceData['accounts'][number]
  recentTransactions: FinanceData['transactions']
}

export function AccountCard({ account, recentTransactions }: AccountCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle>{account.name}</CardTitle>
        <CardDescription>
          {account.type.charAt(0).toUpperCase() + account.type.slice(1)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">
          <span
            className={Number.parseFloat(account.balance) >= 0 ? 'text-green-600' : 'text-red-600'}
          >
            ${Number.parseFloat(account.balance).toLocaleString()}
          </span>
        </div>

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
          </div>
        </div>
      </CardContent>
      <CardFooter className="bg-muted/50 p-3">
        <Button variant="ghost" size="sm" className="ml-auto">
          View Details
        </Button>
      </CardFooter>
    </Card>
  )
}
