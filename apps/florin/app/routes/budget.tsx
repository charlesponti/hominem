'use client'

import { AlertTriangle, DollarSign, Target, TrendingDown, TrendingUp } from 'lucide-react'
import { useState } from 'react'
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Progress } from '~/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { formatCurrency } from '~/lib/finance.utils'
import { trpc } from '~/lib/trpc'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

export default function BudgetDashboard() {
  const budgetCategories = trpc.finance.budget.categories.list.useQuery()
  const budgetCalculateMutation = trpc.finance.budget.calculate.useMutation()
  const [selectedTab, setSelectedTab] = useState('overview')

  // Calculate totals from categories
  const totalIncome =
    budgetCategories.data
      ?.filter((cat) => cat.type === 'income')
      .reduce((sum, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'), 0) || 0

  const totalExpenses =
    budgetCategories.data
      ?.filter((cat) => cat.type === 'expense')
      .reduce((sum, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'), 0) || 0

  const projectedSurplus = totalIncome - totalExpenses
  const savingsRate = totalIncome > 0 ? (projectedSurplus / totalIncome) * 100 : 0

  // Auto-calculate budget on component mount if categories exist
  useState(() => {
    if (budgetCategories.data && budgetCategories.data.length > 0 && !budgetCalculateMutation.data) {
      budgetCalculateMutation.mutateAsync()
    }
  })

  const handleRecalculate = () => {
    budgetCalculateMutation.mutateAsync(undefined)
  }

  if (budgetCategories.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Loading budget data...</p>
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
          Create budget categories to start tracking your financial goals.
        </p>
        <Button asChild>
          <a href="/budget/categories">Create Categories</a>
        </Button>
      </div>
    )
  }

  const incomeCategories = budgetCategories.data.filter((cat) => cat.type === 'income')
  const expenseCategories = budgetCategories.data.filter((cat) => cat.type === 'expense')

  // Prepare chart data
  const categoryData = expenseCategories.map((cat, index) => ({
    name: cat.name,
    amount: Number.parseFloat(cat.averageMonthlyExpense || '0'),
    fill: COLORS[index % COLORS.length],
  }))

  const projectionData =
    budgetCalculateMutation.data?.projections.slice(0, 6).map((proj: { month: number; totalSaved: number }) => ({
      month: `Month ${proj.month}`,
      projected: proj.totalSaved,
      baseline: projectedSurplus * proj.month,
    })) || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Budget Dashboard</h1>
        <Button onClick={handleRecalculate} disabled={budgetCalculateMutation.isPending}>
          {budgetCalculateMutation.isPending ? 'Calculating...' : 'Recalculate'}
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground">
              {incomeCategories.length} income source{incomeCategories.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budgeted Expenses</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalExpenses)}</div>
            <p className="text-xs text-muted-foreground">
              {expenseCategories.length} expense categor
              {expenseCategories.length !== 1 ? 'ies' : 'y'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projected Surplus</CardTitle>
            {projectedSurplus >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${projectedSurplus >= 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {formatCurrency(projectedSurplus)}
            </div>
            <p className="text-xs text-muted-foreground">
              {projectedSurplus >= 0 ? 'Available for savings' : 'Budget deficit'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Savings Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{savingsRate.toFixed(1)}%</div>
            <Progress value={Math.max(0, Math.min(100, savingsRate))} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Target: 20%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
          <TabsTrigger value="tracking">vs Actual</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Budget Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage?.toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="amount"
                      >
                        {categoryData.map((entry) => (
                          <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {expenseCategories.map((category) => {
                    const amount = Number.parseFloat(category.averageMonthlyExpense || '0')
                    const percentage = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0
                    return (
                      <div key={category.id} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{category.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(amount)}
                            </span>
                          </div>
                          <Progress value={percentage} className="mt-1" />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Income Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {incomeCategories.map((category) => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <span className="font-medium">{category.name}</span>
                      <Badge variant="secondary" className="text-green-600">
                        {formatCurrency(Number.parseFloat(category.averageMonthlyExpense || '0'))}
                      </Badge>
                    </div>
                  ))}
                  {incomeCategories.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No income categories found.{' '}
                      <a href="/budget/categories" className="text-blue-600 hover:underline">
                        Add one
                      </a>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Bar dataKey="amount" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projections" className="space-y-6">
          {budgetCalculateMutation.data && (
            <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>6-Month Savings Projection</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={projectionData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Area
                          type="monotone"
                          dataKey="projected"
                          stroke="#8884d8"
                          fill="#8884d8"
                          name="Projected Savings"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Budget Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      <div className="flex justify-between">
                        <span>Monthly Income:</span>
                        <span className="font-semibold text-green-600">
                          {formatCurrency(budgetCalculateMutation.data.income)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Expenses:</span>
                        <span className="font-semibold text-blue-600">
                          {formatCurrency(budgetCalculateMutation.data.totalExpenses)}
                        </span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span>Monthly Surplus:</span>
                        <span
                          className={`font-bold ${budgetCalculateMutation.data.surplus >= 0 ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {formatCurrency(budgetCalculateMutation.data.surplus)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Savings Rate:</span>
                        <span className="font-semibold">{budgetCalculateMutation.data.savingsRate.toFixed(1)}%</span>
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="font-semibold mb-2">12-Month Outlook</h4>
                      <p className="text-sm text-muted-foreground">
                        At current rate: {formatCurrency(budgetCalculateMutation.data.surplus * 12)} saved annually
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="tracking" className="space-y-6">
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Budget vs Actual Tracking</h3>
            <p className="text-gray-600 mb-4">
              This feature is coming soon. You'll be able to compare your budgeted amounts with actual spending.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
