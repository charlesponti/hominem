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
const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

interface BudgetCategoryActual extends BudgetCategory {
  actualSpending: number
  percentageSpent: number
  averageMonthlyExpense: string
}

interface MonthOption {
  value: string
  label: string
}

const getCurrentMonthYear = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  return `${year}-${month}`
}

export default function BudgetTracking() {
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(getCurrentMonthYear())
  const [historyMonths] = useState<number>(6)
  const [showBudgetForm, setShowBudgetForm] = useState(false)

  const {
    data: categories,
    isLoading: isLoadingCategories,
    error: errorCategories,
  } = trpc.finance.budget.categories.list.useQuery()

  const { stats, isLoading: isLoadingStats, error: errorStats } = useMonthlyStats(selectedMonthYear)

  const {
    data: historyData,
    isLoading: isLoadingHistory,
    error: errorHistory,
  } = trpc.finance.budget.history.useQuery({ months: historyMonths })

  const budgetDataWithActuals: BudgetCategoryActual[] = useMemo(() => {
    if (!categories || !stats) return []

    return categories.map((category) => {
      const actualSpending =
        stats.categorySpending.find(
          (cat) => cat.name?.toLowerCase() === category.name.toLowerCase()
        )?.amount || 0

      const averageMonthlyExpense = category.averageMonthlyExpense || '0'
      const budgetAmount = Number.parseFloat(averageMonthlyExpense)
      const percentageSpent = budgetAmount > 0 ? (actualSpending / budgetAmount) * 100 : 0

      return {
        ...category,
        actualSpending,
        percentageSpent,
        averageMonthlyExpense,
      }
    })
  }, [categories, stats])

  const totalAllocated = useMemo(
    () =>
      budgetDataWithActuals.reduce(
        (sum, item) => sum + Number.parseFloat(item.averageMonthlyExpense || '0'),
        0
      ),
    [budgetDataWithActuals]
  )
  const totalActual = useMemo(() => stats?.totalExpenses || 0, [stats])

  // Prepare chart data for budget vs actual comparison
  const chartData = budgetDataWithActuals.map((item) => ({
    name: item.name.length > 15 ? `${item.name.slice(0, 15)}...` : item.name,
    fullName: item.name,
    budgeted: Number.parseFloat(item.averageMonthlyExpense || '0'),
    actual: item.actualSpending,
    variance: Number.parseFloat(item.averageMonthlyExpense || '0') - item.actualSpending,
  }))

  const pieData = budgetDataWithActuals
    .filter((item) => item.actualSpending > 0)
    .map((item, index) => ({
      name: item.name,
      value: item.actualSpending,
      fill: COLORS[index % COLORS.length],
    }))

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

  const getStatusBadge = (percentageSpent: number) => {
    if (percentageSpent > 100) {
      return <Badge variant="destructive">Over Budget</Badge>
    }
    if (percentageSpent > 90) {
      return <Badge variant="default">Warning</Badge>
    }
    return <Badge variant="secondary">On Track</Badge>
  }

  const getStatusIcon = (percentageSpent: number) => {
    if (percentageSpent > 100) {
      return <TrendingUp className="h-4 w-4 text-red-500" />
    }
    if (percentageSpent > 90) {
      return <Target className="h-4 w-4 text-orange-500" />
    }
    return <TrendingDown className="h-4 w-4 text-green-500" />
  }

  const isLoading = isLoadingCategories || isLoadingStats || isLoadingHistory

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

  if (errorCategories || errorStats || errorHistory) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
        <p className="text-gray-600 mb-4">
          {errorCategories?.message ||
            errorStats?.message ||
            errorHistory?.message ||
            'An error occurred while loading data'}
        </p>
        <Button onClick={() => window.location.reload()}>Try Again</Button>
      </div>
    )
  }

  if (!categories || categories.length === 0) {
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

  if (budgetDataWithActuals.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Budget Tracking</h1>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
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
          </div>
        </div>

        <Card>
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Spending Data</h3>
            <p className="text-gray-600">
              No transactions found for{' '}
              {new Date(selectedMonthYear).toLocaleDateString('en-US', {
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
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAllocated)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actual Spending</CardTitle>
            {totalActual > totalAllocated ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Variance</CardTitle>
            {totalActual > totalAllocated ? (
              <TrendingUp className="h-4 w-4 text-red-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${totalActual > totalAllocated ? 'text-red-600' : 'text-green-600'}`}
            >
              {totalActual > totalAllocated ? '+' : ''}
              {formatCurrency(totalActual - totalAllocated)}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalActual > totalAllocated ? 'Over budget' : 'Under budget'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Usage</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((totalActual / totalAllocated) * 100).toFixed(1)}%
            </div>
            <Progress
              value={Math.min(100, (totalActual / totalAllocated) * 100)}
              className="mt-2"
            />
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

      {/* Category Details */}
      <Card>
        <CardHeader>
          <CardTitle>Category Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {budgetDataWithActuals.map((item) => (
              <div key={item.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.percentageSpent)}
                    <span className="font-medium text-lg">{item.name}</span>
                  </div>
                  {getStatusBadge(item.percentageSpent)}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground">Budgeted</p>
                    <p className="font-semibold text-blue-600">
                      {formatCurrency(Number.parseFloat(item.averageMonthlyExpense || '0'))}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Actual</p>
                    <p className="font-semibold">{formatCurrency(item.actualSpending)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Variance</p>
                    <p
                      className={`font-semibold ${item.actualSpending > Number.parseFloat(item.averageMonthlyExpense || '0') ? 'text-red-600' : 'text-green-600'}`}
                    >
                      {item.actualSpending > Number.parseFloat(item.averageMonthlyExpense || '0')
                        ? '+'
                        : ''}
                      {formatCurrency(
                        item.actualSpending - Number.parseFloat(item.averageMonthlyExpense || '0')
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Usage</p>
                    <p className="font-semibold">{item.percentageSpent.toFixed(1)}%</p>
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
                      {formatCurrency(
                        item.actualSpending - Number.parseFloat(item.averageMonthlyExpense || '0')
                      )}{' '}
                      over budget
                    </p>
                  )}
                  {Number.parseFloat(item.averageMonthlyExpense || '0') > 0 &&
                    item.actualSpending === 0 && (
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

      {/* Historical Chart */}
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

      <BudgetCategoryFormModal
        open={showBudgetForm}
        onOpenChange={setShowBudgetForm}
        onSave={async () => setShowBudgetForm(false)}
        onCancel={() => setShowBudgetForm(false)}
      />
    </div>
  )
}
