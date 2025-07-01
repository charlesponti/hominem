import { AlertTriangle, Target } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'

interface BudgetTrackingEmptyStateProps {
  type: 'no-categories' | 'no-spending-data'
  selectedMonthYear?: string
}

export function BudgetTrackingEmptyState({
  type,
  selectedMonthYear,
}: BudgetTrackingEmptyStateProps) {
  if (type === 'no-categories') {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Budget Categories</h3>
        <p className="text-gray-600 mb-4">
          Create budget categories to start tracking your spending.
        </p>
        <Button asChild>
          <a href="/budget/categories/new">Create</a>
        </Button>
      </div>
    )
  }

  if (type === 'no-spending-data') {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Spending Data</h3>
            <p className="text-gray-600">
              No transactions found for{' '}
              {selectedMonthYear &&
                new Date(selectedMonthYear).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                })}
              . Import transactions to see budget vs actual comparisons.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
