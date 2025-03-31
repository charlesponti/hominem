'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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

const BudgetImpactCalculator = () => {
  const [monthlyIncome, setMonthlyIncome] = useState(5000)
  const [currentSavings, setCurrentSavings] = useState(1000)
  const [purchaseType, setPurchaseType] = useState('one-time')
  const [amount, setAmount] = useState(500)
  const [frequency, setFrequency] = useState('monthly')
  const [customValue, setCustomValue] = useState(1)
  const [customUnit, setCustomUnit] = useState('days')

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

    return months.map((month) => {
      const baselineSavings = currentSavings + monthlyIncome * 0.2 * month
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
  const savingsRate = ((monthlyIncome - monthlyImpact) / monthlyIncome) * 100

  const formatFrequencyDisplay = () => {
    if (frequency !== 'custom') return frequency
    return `Every ${customValue} ${customUnit}`
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Budget Impact Calculator</CardTitle>
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
              <h3 className="font-semibold mb-2">Impact Summary</h3>
              <p>Monthly Cost: ${monthlyImpact.toFixed(2)}</p>
              <p>New Savings Rate: {savingsRate.toFixed(1)}%</p>
              <p>12-Month Impact: ${(monthlyImpact * 12).toFixed(2)}</p>
              {purchaseType === 'recurring' && <p>Payment Schedule: {formatFrequencyDisplay()}</p>}
            </div>
          </div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={impactData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
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
  )
}

export default BudgetImpactCalculator
