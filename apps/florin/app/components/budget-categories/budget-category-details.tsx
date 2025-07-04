import { useMemo } from 'react'
import { Progress } from '~/components/ui/progress'
import { useMonthlyStats } from '~/lib/hooks/use-monthly-stats'
import { formatCurrency } from '~/lib/number.utils'
import { trpc } from '~/lib/trpc'
import type { BudgetCategoryWithSpending } from '~/lib/types/budget.types'

// Utility functions for budget calculations
const CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

function getBudgetStatus(percentageSpent: number): 'on-track' | 'warning' | 'over-budget' {
  if (percentageSpent > 100) return 'over-budget'
  if (percentageSpent > 90) return 'warning'
  return 'on-track'
}

function getStatusColor(status: 'on-track' | 'warning' | 'over-budget'): string {
  switch (status) {
    case 'on-track':
      return '#10b981' // emerald-500
    case 'warning':
      return '#f59e0b' // amber-500
    case 'over-budget':
      return '#ef4444' // red-500
  }
}

function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length] || '#0088FE'
}

interface BudgetCategoryDetailsProps {
  selectedMonthYear: string
}

export function BudgetCategoryDetails({ selectedMonthYear }: BudgetCategoryDetailsProps) {
  const {
    data: categories,
    isLoading: isLoadingCategories,
    error: errorCategories,
  } = trpc.finance.budget.categories.list.useQuery()

  const { stats, isLoading: isLoadingStats, error: errorStats } = useMonthlyStats(selectedMonthYear)

  const budgetDataWithActuals: BudgetCategoryWithSpending[] = useMemo(() => {
    if (!categories || !stats) return []

    // Calculate total expenses for allocation percentage (only expense categories)
    const totalExpenses = categories
      .filter((category) => category.type === 'expense')
      .reduce((sum, category) => {
        return sum + Number.parseFloat(category.averageMonthlyExpense || '0')
      }, 0)

    return categories.map((category, index) => {
      const actualSpending =
        stats.categorySpending.find(
          (cat) => cat.name?.toLowerCase() === category.name.toLowerCase()
        )?.amount || 0

      const budgetAmount = Number.parseFloat(category.averageMonthlyExpense || '0')
      const percentageSpent = budgetAmount > 0 ? (actualSpending / budgetAmount) * 100 : 0
      const allocationPercentage = totalExpenses > 0 ? (budgetAmount / totalExpenses) * 100 : 0
      const variance = budgetAmount - actualSpending
      const status = getBudgetStatus(percentageSpent)

      return {
        ...category,
        type: category.type as 'income' | 'expense',
        actualSpending,
        percentageSpent,
        budgetAmount,
        allocationPercentage,
        variance,
        remaining: variance,
        color: category.color || getChartColor(index),
        status,
        statusColor: getStatusColor(status),
      }
    })
  }, [categories, stats])

  if (isLoadingCategories || isLoadingStats) {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
        <p className="mt-2 text-sm text-gray-600">Loading category details...</p>
      </div>
    )
  }

  if (errorCategories || errorStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-red-600">
          <p>Error loading category details</p>
          <p className="text-sm">
            {errorCategories?.message ||
              errorStats?.message ||
              'An error occurred while loading data'}
          </p>
        </div>
      </div>
    )
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">No budget categories found.</p>
          <p className="text-sm text-gray-500">
            Please add budget categories to see tracking details.
          </p>
        </div>
      </div>
    )
  }

  if (budgetDataWithActuals.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">No spending data available for {selectedMonthYear}.</p>
          <p className="text-sm text-gray-500">
            Transactions will appear here once they are recorded.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {budgetDataWithActuals.map((item) => (
        <div key={item.id} className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.statusColor }} />
              <span className="font-medium text-lg">{item.name}</span>
            </div>
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                item.status === 'over-budget'
                  ? 'bg-red-100 text-red-800'
                  : item.status === 'warning'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-green-100 text-green-800'
              }`}
            >
              {item.status === 'over-budget'
                ? 'Over Budget'
                : item.status === 'warning'
                  ? 'Warning'
                  : 'On Track'}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
            <div>
              <p className="text-muted-foreground">Budgeted</p>
              <p className="font-semibold text-blue-600">{formatCurrency(item.budgetAmount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Actual</p>
              <p className="font-semibold">{formatCurrency(item.actualSpending)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Variance</p>
              <p
                className={`font-semibold ${item.variance < 0 ? 'text-red-600' : 'text-green-600'}`}
              >
                {item.variance < 0 ? '+' : ''}
                {formatCurrency(Math.abs(item.variance))}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Usage</p>
              <p className="font-semibold">{item.percentageSpent.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-muted-foreground">Allocation</p>
              <p className="font-semibold text-purple-600">
                {item.allocationPercentage.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Budget usage</span>
              <span>{item.percentageSpent.toFixed(1)}%</span>
            </div>
            <Progress value={Math.min(100, item.percentageSpent)} className="h-2" />
            {item.percentageSpent > 100 && (
              <p className="text-xs text-red-600 mt-1">
                {formatCurrency(Math.abs(item.variance))} over budget
              </p>
            )}
            {item.budgetAmount > 0 && item.actualSpending === 0 && (
              <p className="text-xs text-gray-500 mt-1">No spending recorded for this category</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
