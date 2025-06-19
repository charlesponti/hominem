import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

interface BudgetSummaryCardsProps {
  totalBudget: number
  totalSpent: number
}

export function BudgetSummaryCards({ totalBudget, totalSpent }: BudgetSummaryCardsProps) {
  const remaining = totalBudget - totalSpent

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Budget</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">${totalBudget.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Total Spent</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">${totalSpent.toLocaleString()}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-gray-600">Remaining</CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}
          >
            ${remaining.toLocaleString()}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
