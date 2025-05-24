'use client'

import type { BudgetCategory } from '@hominem/utils/types'
import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BudgetCategoryFormModal } from '~/components/budget-category-form'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useBudgetCategories, useBudgetHistory } from '~/lib/hooks/use-budget-data'
import { useMonthlyStats } from '~/lib/hooks/use-monthly-stats'

interface BudgetCategoryActual extends BudgetCategory {
  actualSpending: number
  percentageSpent: number
  allocatedAmount: number
}

interface MonthOption {
  value: string
  label: string
}

const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

const getCurrentMonthYear = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

function BudgetTrackingPage() {
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(getCurrentMonthYear())
  const [historyMonths] = useState<number>(6)
  const [showBudgetForm, setShowBudgetForm] = useState(false)

  const {
    categories: budgetCategories,
    isLoading: isLoadingCategories,
    error: errorCategories,
  } = useBudgetCategories()

  const { stats, isLoading: isLoadingStats, error: errorStats } = useMonthlyStats(selectedMonthYear)

  const { historyData, isLoadingHistory, errorHistory } = useBudgetHistory(historyMonths)

  const budgetDataWithActuals: BudgetCategoryActual[] = useMemo(() => {
    if (!budgetCategories || !stats || !stats.categorySpending) return []

    return budgetCategories
      .filter((cat: BudgetCategory) => cat.type === 'expense')
      .map((category: BudgetCategory) => {
        const actualSpending =
          stats.categorySpending.find(
            (s: { name: string | null; amount: number }) =>
              s.name !== null && s.name === category.name
          )?.amount || 0
        const allocatedAmount = Number.parseFloat(category.averageMonthlyExpense || '0')
        const percentageSpent = allocatedAmount > 0 ? (actualSpending / allocatedAmount) * 100 : 0
        return {
          ...category,
          allocatedAmount,
          actualSpending,
          percentageSpent: Math.min(100, percentageSpent),
        }
      })
  }, [budgetCategories, stats])

  const totalAllocated = useMemo(
    () => budgetDataWithActuals.reduce((sum, item) => sum + item.allocatedAmount, 0),
    [budgetDataWithActuals]
  )
  const totalActual = useMemo(() => stats?.totalExpenses || 0, [stats])

  const pieData = useMemo(
    () =>
      budgetDataWithActuals.map((item) => ({
        name: item.name,
        value: item.actualSpending,
      })),
    [budgetDataWithActuals]
  )

  const monthOptions = useMemo<MonthOption[]>(() => {
    const options: MonthOption[] = []
    const today = new Date()
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      options.push({
        value: `${year}-${month}`,
        label: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
      })
    }
    return options
  }, [])

  if (isLoadingCategories || isLoadingStats || isLoadingHistory) {
    return <div>Loading budget data...</div>
  }

  if (errorCategories || errorStats || errorHistory) {
    return (
      <div>
        Error loading data:{' '}
        {(errorCategories as Error)?.message ||
          (errorStats as Error)?.message ||
          (errorHistory as Error)?.message}
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <CardHeader className="px-0 flex flex-row justify-between items-center">
        <CardTitle>Budget vs. Actuals Tracking</CardTitle>
        <div className="flex items-center space-x-2">
          <Select value={selectedMonthYear} onValueChange={setSelectedMonthYear}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            className="ml-2 px-3 py-2 rounded bg-primary text-white hover:bg-primary/90 transition-colors"
            type="button"
            onClick={() => setShowBudgetForm(true)}
            aria-label="Add Budget Category"
          >
            + Budget
          </button>
        </div>
      </CardHeader>

      {budgetDataWithActuals.length === 0 && !isLoadingCategories && !isLoadingStats && (
        <Card>
          <CardContent className="pt-6">
            <p>
              No expense budget categories found for the selected period, or no spending data
              available.
            </p>
            <p>Please set up your budget categories and ensure transactions are recorded.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Overall Summary ({selectedMonthYear})</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Total Budgeted: ${totalAllocated.toFixed(2)}</p>
            <p>Total Spent: ${totalActual.toFixed(2)}</p>
            <p>
              {totalAllocated - totalActual >= 0 ? 'Remaining' : 'Overspent'}: $
              {Math.abs(totalAllocated - totalActual).toFixed(2)}
            </p>
          </CardContent>
        </Card>
        {budgetDataWithActuals.map((category) => (
          <Card key={category.id}>
            <CardHeader>
              <CardTitle className="text-lg">{category.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Actual: ${category.actualSpending.toFixed(2)}</span>
                <span>Budget: ${category.allocatedAmount.toFixed(2)}</span>
              </div>
              <Progress value={category.percentageSpent} className="w-full" />
              <p
                className={`text-sm ${category.percentageSpent > 100 ? 'text-red-500' : category.percentageSpent > 90 ? 'text-orange-500' : 'text-gray-500'}`}
              >
                {category.percentageSpent > 100
                  ? `${(category.percentageSpent - 100).toFixed(0)}% over budget`
                  : `${category.percentageSpent.toFixed(0)}% of budget used`}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Spending by Category ({selectedMonthYear})</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[400px]">
            {pieData && pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }: { name: string; percent: number }) =>
                      `${name} (${(percent * 100).toFixed(0)}%)`
                    }
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p>No spending data for categories in {selectedMonthYear}.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Budget Adherence Over Time ({historyMonths} Months)</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] md:h-[400px]">
            {historyData && historyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="budgeted"
                    stroke="#8884d8"
                    activeDot={{ r: 8 }}
                    name="Total Budgeted"
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    stroke="#82ca9d"
                    name="Total Actual Spending"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p>No historical data available for the selected period.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <BudgetCategoryFormModal
        open={showBudgetForm}
        onOpenChange={setShowBudgetForm}
        onSave={async () => setShowBudgetForm(false)}
        onCancel={() => setShowBudgetForm(false)}
      />
    </div>
  )
}

export default BudgetTrackingPage
