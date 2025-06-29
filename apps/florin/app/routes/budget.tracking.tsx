'use client'

import type { BudgetCategory } from '@hominem/utils/schema'
import { AlertTriangle, Calendar, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
    Bar,
    BarChart,
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
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Progress } from '~/components/ui/progress'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'
import { formatCurrency } from '~/lib/finance.utils'
import { useMonthlyStats } from '~/lib/hooks/use-monthly-stats'
import { trpc } from '~/lib/trpc'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function BudgetTracking() {
  const [selectedMonth, setSelectedMonth] = useState(
    new Date()
      .toISOString()
      .slice(0, 7) // YYYY-MM format
  )

  const budgetCategories = trpc.finance.budget.categories.list.useQuery()
  const budgetHistory = trpc.finance.budget.history.useQuery({ months: 6 })

  const isLoading = budgetCategories.isLoading || budgetHistory.isLoading

  // Placeholder data since useBudgetVsActual was removed
  const budgetVsActual: any[] = []
  const totals = {
    totalBudgeted: 0,
    totalActual: 0,
    totalVariance: 0,
    overallPercentage: 0,
  }

  // Prepare chart data
  const chartData = budgetVsActual.map((item) => ({
    name: item.name.length > 15 ? `${item.name.slice(0, 15)}...` : item.name,
    fullName: item.name,
    budgeted: item.budgetedAmount,
    actual: item.actualAmount,
    variance: item.variance,
  }))

  const pieData = budgetVsActual
    .filter((item) => item.actualAmount > 0)
    .map((item, index) => ({
      name: item.name,
      value: item.actualAmount,
      fill: COLORS[index % COLORS.length],
    }))

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'over':
        return <Badge variant="destructive">Over Budget</Badge>
      case 'warning':
        return <Badge variant="default">Warning</Badge>
      default:
        return <Badge variant="secondary">On Track</Badge>
    }
  }

  const getStatusIcon = (item: { variance: number }) => {
    if (item.variance > 0) {
      return <TrendingUp className="h-4 w-4 text-red-500" />
    }
    if (item.variance < 0) {
      return <TrendingDown className="h-4 w-4 text-green-500" />
    }
    return <Target className="h-4 w-4 text-blue-500" />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading tracking data...</p>
        </div>
      </div>
    )
  }

  if (!budgetCategories.data || budgetCategories.data.length === 0) {
    return (
      <div className="text-center py-12">
        <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Budget Categories</h3>
        <p className="text-gray-600 mb-4">
          Create budget categories to start tracking your spending.
        </p>
        <Button asChild>
          <a href="/budget/categories">Create Categories</a>
        </Button>
      </div>
    )
  }

  if (budgetVsActual.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Budget Tracking</h1>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-auto"
            />
          </div>
        </div>

        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Spending Data</h3>
            <p className="text-gray-600">
              No transactions found for{' '}
              {new Date(selectedMonth).toLocaleDateString('en-US', {
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Budget Tracking</h1>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(totals.totalBudgeted)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Spending</CardTitle>
            {totals.totalVariance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totals.totalActual)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
            {totals.totalVariance >= 0 ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${totals.totalVariance >= 0 ? 'text-red-600' : 'text-green-600'}`}
            >
              {totals.totalVariance >= 0 ? '+' : ''}
              {formatCurrency(totals.totalVariance)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totals.totalVariance >= 0 ? 'Over budget' : 'Under budget'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.overallPercentage.toFixed(1)}%</div>
            <Progress value={Math.min(100, totals.overallPercentage)} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Budget vs Actual Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value, name) => [formatCurrency(Number(value)), name]}
                    labelFormatter={(label) => {
                      const item = chartData.find((d) => d.name === label)
                      return item?.fullName || label
                    }}
                  />
                  <Bar dataKey="budgeted" fill="#8884d8" name="Budgeted" />
                  <Bar dataKey="actual" fill="#82ca9d" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actual Spending Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Category Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {budgetVsActual.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item)}
                    <span className="font-medium text-lg">{item.name}</span>
                  </div>
                  {getStatusBadge(item.status)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground">Budgeted</p>
                    <p className="font-semibold text-blue-600">
                      {formatCurrency(item.budgetedAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Actual</p>
                    <p className="font-semibold">{formatCurrency(item.actualAmount)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Variance</p>
                    <p
                      className={`font-semibold ${item.variance >= 0 ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {item.variance >= 0 ? '+' : ''}
                      {formatCurrency(item.variance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Usage</p>
                    <p className="font-semibold">{item.percentageUsed.toFixed(1)}%</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Budget usage</span>
                    <span>{item.percentageUsed.toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(100, item.percentageUsed)} className="h-2" />
                  {item.isOverBudget && (
                    <p className="text-xs text-red-600 mt-1">
                      {formatCurrency(item.variance)} over budget
                    </p>
                  )}
                  {item.budgetedAmount > 0 && item.actualAmount === 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      No spending recorded for this category
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

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
    data: categories,
    isLoading: isLoadingCategories,
    error: errorCategories,
  } = trpc.finance.budget.categories.list.useQuery()

  const { stats, isLoading: isLoadingStats, error: errorStats } = useMonthlyStats(selectedMonthYear)

  const { data: historyData, isLoading: isLoadingHistory, error: errorHistory } = trpc.finance.budget.history.useQuery({ months: historyMonths })

  const budgetDataWithActuals: BudgetCategoryActual[] = useMemo(() => {
    if (!categories || !stats) return []

    return categories.map((category) => {
      const actualSpending = stats.categorySpending.find(
        (cat) => cat.name?.toLowerCase() === category.name.toLowerCase()
      )?.amount || 0

      const allocatedAmount = Number.parseFloat(category.averageMonthlyExpense || '0')
      const percentageSpent = allocatedAmount > 0 ? (actualSpending / allocatedAmount) * 100 : 0

      return {
        ...category,
        actualSpending,
        percentageSpent,
        allocatedAmount,
      }
    })
  }, [categories, stats])

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
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
        <p className="text-gray-600 mb-4">
          {errorCategories?.message || errorStats?.message || errorHistory?.message || 'An error occurred while loading data'}
        </p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
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
