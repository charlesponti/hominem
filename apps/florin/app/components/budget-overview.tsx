'use client'

import { Target, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'
import { formatCurrency } from '~/lib/number.utils'
import { useMonthlyStats } from '~/lib/hooks/use-monthly-stats'
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
  const budgetUsagePercentage = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0
  const isOverBudget = totalActual > totalBudgeted

  if (isLoadingCategories || isLoadingStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading budget data...</p>
        </div>
      </div>
    )
  }

  if (errorCategories || errorStats) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Budget Data</h3>
        <p className="text-gray-600 mb-4">
          {errorCategories?.message ||
            errorStats?.message ||
            'An error occurred while loading data'}
        </p>
      </div>
    )
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Budget Categories</h3>
        <p className="text-gray-600">Please add budget categories to see performance data.</p>
      </div>
    )
  }

  if (totalBudgeted === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Budget Set</h3>
        <p className="text-gray-600">
          Set budget amounts for your categories to track performance.
        </p>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Budget Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Performance Metrics */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Budgeted</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalBudgeted)}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {isOverBudget ? (
                <TrendingUp className="h-4 w-4 text-red-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-medium">Actual Spending</span>
            </div>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
          </div>
        </div>

        {/* Variance and Usage */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Variance</span>
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-bold ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}
              >
                {isOverBudget ? '+' : ''}
                {formatCurrency(Math.abs(variance))}
              </span>
              <span className="text-xs text-muted-foreground">
                {isOverBudget ? 'Over budget' : 'Under budget'}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Budget Usage</span>
              <span className="text-sm font-bold">{budgetUsagePercentage.toFixed(1)}%</span>
            </div>
            <Progress
              value={Math.min(100, budgetUsagePercentage)}
              className="h-2"
              style={
                {
                  '--progress-color': isOverBudget
                    ? '#ef4444'
                    : budgetUsagePercentage > 80
                      ? '#f59e0b'
                      : '#10b981',
                } as React.CSSProperties
              }
            />
          </div>
        </div>

        {/* Summary */}
        <div className="text-center pt-2 border-t">
          <p className="text-sm text-muted-foreground">
            {isOverBudget
              ? `You've spent ${formatCurrency(Math.abs(variance))} more than budgeted`
              : `You're ${formatCurrency(Math.abs(variance))} under budget`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
