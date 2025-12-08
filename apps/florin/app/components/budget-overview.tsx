import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card'
import { Target } from 'lucide-react'
import { useMemo } from 'react'
import { useMonthlyStats } from '~/lib/hooks/use-monthly-stats'
import { formatCurrency } from '~/lib/number.utils'
import { trpc } from '~/lib/trpc'

interface BudgetOverviewProps {
  selectedMonthYear?: string
}

export function BudgetOverview({ selectedMonthYear }: BudgetOverviewProps) {
  const {
    data: categories,
    isLoading: isLoadingCategories,
    error: errorCategories,
  } = trpc.finance.budget.categories.list.useQuery()

  const {
    stats,
    isLoading: isLoadingStats,
    error: errorStats,
  } = useMonthlyStats(selectedMonthYear || '')

  // Calculate total budgeted amount from categories
  const totalBudgeted = useMemo(() => {
    if (!categories) return 0
    return categories
      .filter((category) => category.type === 'expense')
      .reduce((sum, category) => sum + Number.parseFloat(category.averageMonthlyExpense || '0'), 0)
  }, [categories])

  // Get actual spending from stats
  const totalActual = useMemo(() => stats?.totalExpenses || 0, [stats])

  // Calculate performance metrics
  const variance = totalBudgeted - totalActual
  const isOverBudget = totalActual > totalBudgeted

  if (isLoadingCategories || isLoadingStats) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto" />
            <p className="mt-2 text-xs text-gray-600">Loading budget data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (errorCategories || errorStats) {
    return (
      <Card>
        <CardContent className="text-center py-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">Error Loading Budget Data</h3>
          <p className="text-xs text-gray-600">
            {errorCategories?.message ||
              errorStats?.message ||
              'An error occurred while loading data'}
          </p>
        </CardContent>
      </Card>
    )
  }

  if (!categories || categories.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No Budget Categories</h3>
          <p className="text-xs text-gray-600">
            Please add budget categories to see performance data.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (totalBudgeted === 0) {
    return (
      <Card>
        <CardContent className="text-center py-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-1">No Budget Set</h3>
          <p className="text-xs text-gray-600">
            Set budget amounts for your categories to track performance.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="h-4 w-4" />
          Budget Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Budgeted</div>
            <div className="text-lg font-semibold text-blue-600">
              {formatCurrency(totalBudgeted)}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Actual</div>
            <div className="text-lg font-semibold">{formatCurrency(totalActual)}</div>
          </div>

          {/* Remaining Budget */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {isOverBudget ? 'Over Budget' : 'Remaining'}
            </div>
            <div className="text-lg font-semibold">{formatCurrency(Math.abs(variance))}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
