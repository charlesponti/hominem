'use client'

import { AlertTriangle, Calendar, DollarSign, TrendingDown } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { formatCurrency } from '~/lib/finance.utils'

interface PlannedPurchase {
  description: string
  amount: number
  date: string
}

export default function RunwayPage() {
  const [initialBalance, setInitialBalance] = useState(0)
  const [monthlyExpenses, setMonthlyExpenses] = useState(0)
  const [plannedPurchases, setPlannedPurchases] = useState<PlannedPurchase[]>([])
  const [newPurchase, setNewPurchase] = useState<PlannedPurchase>({
    description: '',
    amount: 0,
    date: '',
  })

  const chartData = useMemo(() => {
    const today = new Date()
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(today)
      date.setMonth(today.getMonth() + i)
      return {
        month: date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        date: new Date(date),
      }
    })

    let balance = initialBalance
    return months.map(({ month, date }) => {
      balance -= monthlyExpenses

      // Apply planned purchases for this month
      for (const purchase of plannedPurchases) {
        const purchaseDate = new Date(purchase.date)
        if (
          purchaseDate.getMonth() === date.getMonth() &&
          purchaseDate.getFullYear() === date.getFullYear()
        ) {
          balance -= purchase.amount
        }
      }

      return {
        month,
        balance: Math.round(balance),
      }
    })
  }, [initialBalance, monthlyExpenses, plannedPurchases])

  // Calculate runway metrics
  const runwayMetrics = useMemo(() => {
    const totalPlannedExpenses = plannedPurchases.reduce(
      (sum, purchase) => sum + purchase.amount,
      0
    )
    const monthsUntilZero =
      monthlyExpenses > 0
        ? Math.floor((initialBalance - totalPlannedExpenses) / monthlyExpenses)
        : Number.POSITIVE_INFINITY
    const zeroDate = new Date()
    zeroDate.setMonth(zeroDate.getMonth() + monthsUntilZero)

    const minimumBalance = Math.min(...chartData.map((d) => d.balance))
    const isRunwayDangerous = monthsUntilZero <= 6

    return {
      monthsUntilZero,
      zeroDate,
      minimumBalance,
      isRunwayDangerous,
      totalPlannedExpenses,
    }
  }, [initialBalance, monthlyExpenses, plannedPurchases, chartData])

  const handleAddPurchase = () => {
    if (newPurchase.description && newPurchase.amount > 0 && newPurchase.date) {
      setPlannedPurchases([...plannedPurchases, newPurchase])
      setNewPurchase({ description: '', amount: 0, date: '' })
    }
  }

  const handleRemovePurchase = (index: number) => {
    setPlannedPurchases(plannedPurchases.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Financial Runway Calculator</h1>
        {runwayMetrics.isRunwayDangerous && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Short Runway
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(initialBalance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Burn Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(monthlyExpenses)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Runway (Months)</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${runwayMetrics.isRunwayDangerous ? 'text-red-600' : 'text-green-600'}`}
            >
              {runwayMetrics.monthsUntilZero === Number.POSITIVE_INFINITY
                ? '∞'
                : runwayMetrics.monthsUntilZero}
            </div>
            {runwayMetrics.monthsUntilZero !== Number.POSITIVE_INFINITY && (
              <p className="text-xs text-muted-foreground">
                Until {runwayMetrics.zeroDate.toLocaleDateString()}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minimum Balance</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${runwayMetrics.minimumBalance < 0 ? 'text-red-600' : 'text-blue-600'}`}
            >
              {formatCurrency(runwayMetrics.minimumBalance)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Input Form */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Financial Parameters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="initialBalance">Initial Balance ($)</Label>
              <Input
                type="number"
                id="initialBalance"
                value={initialBalance}
                onChange={(e) => setInitialBalance(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="monthlyExpenses">Monthly Expenses ($)</Label>
              <Input
                type="number"
                id="monthlyExpenses"
                value={monthlyExpenses}
                onChange={(e) => setMonthlyExpenses(Number(e.target.value))}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Add Planned Purchase</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="e.g., New laptop"
                  value={newPurchase.description}
                  onChange={(e) => setNewPurchase({ ...newPurchase, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    type="number"
                    id="amount"
                    placeholder="0"
                    value={newPurchase.amount}
                    onChange={(e) =>
                      setNewPurchase({ ...newPurchase, amount: Number(e.target.value) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input
                    type="date"
                    id="date"
                    value={newPurchase.date}
                    onChange={(e) => setNewPurchase({ ...newPurchase, date: e.target.value })}
                  />
                </div>
              </div>
              <Button
                onClick={handleAddPurchase}
                className="w-full"
                disabled={!newPurchase.description || newPurchase.amount <= 0 || !newPurchase.date}
              >
                Add Purchase
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Planned Purchases List */}
      {plannedPurchases.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Planned Purchases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {plannedPurchases.map((purchase, index) => (
                <div
                  key={`${purchase.description}-${purchase.date}-${index}`}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <span className="font-medium">{purchase.description}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      on {new Date(purchase.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatCurrency(purchase.amount)}</span>
                    <Button variant="outline" size="sm" onClick={() => handleRemovePurchase(index)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center font-semibold">
                  <span>Total Planned Expenses:</span>
                  <span>{formatCurrency(runwayMetrics.totalPlannedExpenses)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>12-Month Runway Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Projected Balance']}
                  labelStyle={{ color: '#374151' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                  }}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="2 2" />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={(props) => {
                    const { cx, cy, payload } = props
                    const isNegative = payload?.balance < 0
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        fill={isNegative ? '#ef4444' : '#10b981'}
                        stroke={isNegative ? '#ef4444' : '#10b981'}
                        strokeWidth={2}
                      />
                    )
                  }}
                  activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
