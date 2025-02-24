'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../../components/ui/select'
import { Slider } from '../../../../components/ui/slider'
import {
  type StateTaxCode,
  calculateTakeHome,
  stateTaxRates,
  formatCurrency,
} from '../../../../lib/finance'

const StateTaxCalculator = () => {
  const [income, setIncome] = useState(100000)
  const [state1, setState1] = useState('CA')
  const [state2, setState2] = useState('TX')

  const state1Calc = calculateTakeHome(income, state1)
  const state2Calc = calculateTakeHome(income, state2)
  const difference = state1Calc.takeHome - state2Calc.takeHome

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>State Tax Comparison Calculator</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="income">
              Annual Income: {formatCurrency(income)}
            </label>
            <Slider
              name="income"
              defaultValue={[income]}
              max={500000}
              step={1000}
              onValueChange={(value) => setIncome(value[0])}
              className="w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="state1">
                State 1
              </label>
              <Select name="state1" value={state1} onValueChange={setState1}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(stateTaxRates).map(([code, info]) => (
                    <SelectItem key={code} value={code}>
                      {info.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" htmlFor="state2">
                State 2
              </label>
              <Select name="state2" value={state2} onValueChange={setState2}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(stateTaxRates).map(([code, info]) => (
                    <SelectItem key={code} value={code}>
                      {info.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 bg-gray-50 p-6 rounded-lg">
            <TaxBreakdown stateCode={state1} calculation={state1Calc} />
            <TaxBreakdown stateCode={state2} calculation={state2Calc} />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-center font-medium">
              {Math.abs(difference) < 1 ? (
                'No difference in take-home pay'
              ) : (
                <>
                  {formatCurrency(Math.abs(difference))} more in take-home pay in{' '}
                  {difference > 0 ? stateTaxRates[state1].name : stateTaxRates[state2].name}
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default StateTaxCalculator

interface TaxBreakdownProps {
  stateCode: StateTaxCode
  calculation: ReturnType<typeof calculateTakeHome>
}
const TaxBreakdown = ({ stateCode, calculation }: TaxBreakdownProps) => (
  <div className="space-y-3">
    <div className="text-lg font-semibold mb-4">{stateTaxRates[stateCode].name}</div>
    <div className="text-sm text-gray-600 italic mb-4">{stateTaxRates[stateCode].notes}</div>
    <div className="space-y-2">
      <div className="flex justify-between">
        <span className="text-gray-600">Federal Tax:</span>
        <span className="text-red-600">-{formatCurrency(calculation.federalTax)}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">State Tax:</span>
        <span className="text-red-600">-{formatCurrency(calculation.stateTax)}</span>
      </div>
      <div className="h-px bg-gray-200 my-2" />
      <div className="flex justify-between font-medium">
        <span>Take-Home Pay:</span>
        <span className="text-green-600">{formatCurrency(calculation.takeHome)}</span>
      </div>
      <div className="text-sm text-gray-500 text-right">
        Effective Tax Rate: {calculation.effectiveTaxRate.toFixed(1)}%
      </div>
    </div>
  </div>
)
