'use client'

import { Target } from 'lucide-react'
import { useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { BudgetCategoryDetails } from '~/components/budget-categories'
import { BudgetTrackingHeader } from '~/components/budget-categories/budget-tracking-header'
import { BudgetOverview } from '~/components/budget-overview'
import { getCurrentMonthYear } from '~/components/date-month-select'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatCurrency } from '~/lib/number.utils'
import { trpc } from '~/lib/trpc'

export default function BudgetDashboard() {
  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(getCurrentMonthYear())
  const budgetCategories = trpc.finance.budget.categories.list.useQuery()
  const budgetCalculateMutation = trpc.finance.budget.calculate.useMutation({
    onError: (error) => {
      console.error('Budget calculation error:', error.message)
    },
  })

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

  // Auto-calculate budget on component mount if categories exist and there are income categories
  useState(() => {
    if (
      budgetCategories.data &&
      budgetCategories.data.length > 0 &&
      !budgetCalculateMutation.data &&
      totalIncome > 0
    ) {
      budgetCalculateMutation.mutateAsync()
    }
  })

  const handleRecalculate = () => {
    if (totalIncome > 0) {
      budgetCalculateMutation.mutateAsync(undefined)
    }
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

  const expenseCategories = budgetCategories.data.filter((cat) => cat.type === 'expense')

  const projectionData =
    budgetCalculateMutation.data?.projections
      .slice(0, 6)
      .map((proj: { month: number; totalSaved: number }) => ({
        month: `Month ${proj.month}`,
        projected: proj.totalSaved,
        baseline: projectedSurplus * proj.month,
      })) || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Budget Dashboard</h1>
        <Button
          onClick={handleRecalculate}
          disabled={budgetCalculateMutation.isPending || totalIncome <= 0}
        >
          {budgetCalculateMutation.isPending ? 'Calculating...' : 'Recalculate'}
        </Button>
      </div>

      <BudgetOverview selectedMonthYear={selectedMonthYear} />

      <BudgetTrackingHeader
        selectedMonthYear={selectedMonthYear}
        onMonthChange={setSelectedMonthYear}
      />

      <BudgetCategoryDetails selectedMonthYear={selectedMonthYear} />

      {totalIncome <= 0 ? (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Income Categories Required</h3>
          <p className="text-gray-600 mb-4">
            Add income categories to see budget projections and savings calculations.
          </p>
          <Button asChild>
            <a href="/budget/categories/new">Add Income Categories</a>
          </Button>
        </div>
      ) : budgetCalculateMutation.data ? (
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
                    <span className="font-semibold">
                      {budgetCalculateMutation.data.savingsRate.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-semibold mb-2">12-Month Outlook</h4>
                  <p className="text-sm text-muted-foreground">
                    At current rate: {formatCurrency(budgetCalculateMutation.data.surplus * 12)}{' '}
                    saved annually
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Calculating projections...</p>
        </div>
      )}
    </div>
  )
}
