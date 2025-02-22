'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import React, { useState } from 'react'
import {
  formatCurrency,
  stateTaxRates,
  calculateFederalTax,
  calculateStateTax,
  calculateTakeHome,
} from '../../../../lib/finance'
import { formatPercent } from '../../../../lib/number.tools'

const IncomeTaxCalculator = () => {
  const [income, setIncome] = useState(50000)
  const [state, setState] = useState<keyof typeof stateTaxRates>('CA')

  const federalTax = calculateFederalTax(income)
  const stateTax = calculateStateTax(income, state)
  const takeHome = calculateTakeHome(income, state)

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Income Tax Calculator</CardTitle>
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

          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="state">
              State
            </label>
            <Select
              name="state"
              value={state}
              onValueChange={(v: keyof typeof stateTaxRates) => setState(v)}
            >
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

          <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Gross Income:</span>
              <span className="font-medium">{formatCurrency(income)}</span>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Federal Tax:</span>
              <div className="text-right">
                <div className="font-medium text-red-600">-{formatCurrency(federalTax)}</div>
                <div className="text-xs text-gray-500">
                  ({formatPercent(federalTax / income)} effective rate)
                </div>
              </div>
            </div>

            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{stateTaxRates[state].name} State Tax:</span>
              <div className="text-right">
                <div className="font-medium text-red-600">-{formatCurrency(stateTax)}</div>
                <div className="text-xs text-gray-500">
                  ({formatPercent(stateTax / income)} flat rate)
                </div>
              </div>
            </div>

            <div className="h-px bg-gray-200 my-2" />

            <div className="flex justify-between font-medium">
              <span>Take-Home Pay:</span>
              <div className="text-right">
                <div className="text-lg text-green-600">{formatCurrency(takeHome.takeHome)}</div>
                <div className="text-xs text-gray-500">
                  ({formatPercent(takeHome.takeHome / income)} of gross)
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default IncomeTaxCalculator
