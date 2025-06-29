'use client'

import { AlertTriangle, Target, TrendingUp } from 'lucide-react'
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
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '~/components/ui/select'
import { formatCurrency } from '~/lib/finance.utils'
import { trpc } from '~/lib/trpc'

const BudgetImpactCalculator = () => {
  const budgetCategories = trpc.finance.budget.categories.list.useQuery()
  const budgetCalculateMutation = trpc.finance.budget.calculate.useMutation()

  const [monthlyIncome, setMonthlyIncome] = useState(5000)
  const [currentSavings, setCurrentSavings] = useState(1000)
  const [purchaseType, setPurchaseType] = useState('one-time')
  const [amount, setAmount] = useState(500)
  const [frequency, setFrequency] = useState('monthly')
  const [customValue, setCustomValue] = useState(1)
  const [customUnit, setCustomUnit] = useState('days')
  const [useActualBudget, setUseActualBudget] = useState(false)

  // Get actual budget data if available
  const actualIncome =
    budgetCategories.data
      ?.filter((cat) => cat.type === 'income')
      .reduce((sum, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'), 0) || 0

  const actualExpenses =
    budgetCategories.data
      ?.filter((cat) => cat.type === 'expense')
      .reduce((sum, cat) => sum + Number.parseFloat(cat.averageMonthlyExpense || '0'), 0) || 0

  const hasActualBudget = budgetCategories.data && budgetCategories.data.length > 0 && actualIncome > 0

  // Use actual budget data if enabled and available
  const effectiveIncome = useActualBudget && hasActualBudget ? actualIncome : monthlyIncome
  const baselineSavingsRate =
    useActualBudget && hasActualBudget ? ((actualIncome - actualExpenses) / actualIncome) * 100 : 20 // Default 20% savings rate

  // Calculate monthly cost based on frequency
  const calculateMonthlyRate = () => {
    if (purchaseType === 'one-time') return amount / 12

    switch (frequency) {
      case 'weekly':
        return (amount * 52) / 12
      case 'monthly':
        return amount
      case 'quarterly':
        return amount / 3
      case 'annually':
        return amount / 12
      case 'custom':
        // Convert custom frequency to monthly rate
        switch (customUnit) {
          case 'days':
            return (amount * (365 / customValue)) / 12
          case 'weeks':
            return (amount * (52 / customValue)) / 12
          case 'months':
            return amount / customValue
          case 'years':
            return amount / (12 * customValue)
          default:
            return amount
        }
      default:
        return amount
    }
  }

  // Calculate impact over next 12 months
  const calculateImpact = () => {
    const months = Array.from({ length: 12 }, (_, i) => i + 1)
    const monthlyImpact = calculateMonthlyRate()
    const baselineMonthlySavings = effectiveIncome * (baselineSavingsRate / 100)

    return months.map((month) => {
      const baselineSavings = currentSavings + baselineMonthlySavings * month
      const impactedSavings = baselineSavings - monthlyImpact * month

      return {
        month: `Month ${month}`,
        baseline: Math.round(baselineSavings),
        withPurchase: Math.round(impactedSavings),
      }
    })
  }

  const impactData = calculateImpact()
  const monthlyImpact = calculateMonthlyRate()
  const newSavingsRate =
    ((effectiveIncome * (baselineSavingsRate / 100) - monthlyImpact) / effectiveIncome) * 100

  const formatFrequencyDisplay = () => {
    if (frequency !== 'custom') return frequency
    return `Every ${customValue} ${customUnit}`
  }

  const handleLoadActualBudget = () => {
    if (hasActualBudget) {
      setMonthlyIncome(actualIncome)
      setUseActualBudget(true)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Budget Impact Calculator</h1>
        {hasActualBudget && (
          <Button variant="outline" onClick={handleLoadActualBudget} disabled={useActualBudget}>
            {useActualBudget ? 'Using Actual Budget' : 'Load My Budget'}
          </Button>
        )}
      </div>

      {useActualBudget && hasActualBudget && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span className="font-semibold text-blue-900">Using Your Actual Budget</span>
          </div>
          <p className="text-blue-700 text-sm mt-1">
            Income: {formatCurrency(actualIncome)} | Expenses: {formatCurrency(actualExpenses)} |
            Current Savings Rate:{' '}
            {(((actualIncome - actualExpenses) / actualIncome) * 100).toFixed(1)}%
          </p>
        </div>
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Purchase Impact Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Monthly Income</Label>
                <Input
                  type="number"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                  className="mt-1"
                  disabled={useActualBudget}
                />
              </div>

              <div>
                <Label>Current Savings</Label>
                <Input
                  type="number"
                  value={currentSavings}
                  onChange={(e) => setCurrentSavings(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Purchase Type</Label>
                <RadioGroup value={purchaseType} onValueChange={setPurchaseType} className="mt-1">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="one-time" id="one-time" />
                    <Label htmlFor="one-time">One-time Purchase</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recurring" id="recurring" />
                    <Label htmlFor="recurring">Recurring Subscription</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="mt-1"
                />
              </div>

              {purchaseType === 'recurring' && (
                <div className="space-y-4">
                  <div>
                    <Label>Frequency</Label>
                    <Select value={frequency} onValueChange={setFrequency}>
                      <SelectTrigger>
                        <SelectValue>{formatFrequencyDisplay()}</SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {frequency === 'custom' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Every</Label>
                        <Input
                          type="number"
                          min="1"
                          value={customValue}
                          onChange={(e) => setCustomValue(Number(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label>Unit</Label>
                        <Select value={customUnit} onValueChange={setCustomUnit}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="days">Days</SelectItem>
                            <SelectItem value="weeks">Weeks</SelectItem>
                            <SelectItem value="months">Months</SelectItem>
                            <SelectItem value="years">Years</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-100 rounded-lg">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Impact Summary
                </h3>
                <div className="space-y-1 text-sm">
                  <p>
                    Monthly Cost:{' '}
                    <span className="font-semibold">{formatCurrency(monthlyImpact)}</span>
                  </p>
                  <p>
                    Current Savings Rate:{' '}
                    <span className="font-semibold">{baselineSavingsRate.toFixed(1)}%</span>
                  </p>
                  <p>
                    New Savings Rate:{' '}
                    <span
                      className={`font-semibold ${newSavingsRate >= 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {newSavingsRate.toFixed(1)}%
                    </span>
                  </p>
                  <p>
                    12-Month Impact:{' '}
                    <span className="font-semibold">{formatCurrency(monthlyImpact * 12)}</span>
                  </p>
                  {purchaseType === 'recurring' && (
                    <p>
                      Payment Schedule:{' '}
                      <span className="font-semibold">{formatFrequencyDisplay()}</span>
                    </p>
                  )}
                </div>
              </div>

              {newSavingsRate < 0 && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-semibold">Budget Warning</span>
                  </div>
                  <p className="text-red-700 text-sm mt-1">
                    This purchase would put you over budget. Consider reducing other expenses or
                    finding a more affordable option.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={impactData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Area
                  type="monotone"
                  dataKey="baseline"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="Without Purchase"
                />
                <Area
                  type="monotone"
                  dataKey="withPurchase"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="With Purchase"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default BudgetImpactCalculator
