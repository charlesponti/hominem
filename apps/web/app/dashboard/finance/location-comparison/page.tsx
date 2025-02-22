'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Trash2 } from 'lucide-react'
import React, { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '../../../../lib/finance'
import { useIndexedDBCollection } from '../../../../lib/hooks/use-indexdb-collection'
import { formatPercent } from '../../../../lib/number.tools'

const INITIAL_LOCATIONS = [
  {
    id: crypto.randomUUID(),
    place: 'Los Angeles, CA',
    annualGrossIncome: 180000,
    annualGrossTax: 121212,
    annualNetIncome: 124074,
    monthlyGrossIncome: 15000,
    housing: 2800,
    utilities: 1000,
    monthlyNetIncome: 6539.5,
    costIndex: 173.3,
    taxRate: 32.6,
    savingsRate: 25.4,
  },
  {
    id: crypto.randomUUID(),
    place: 'Dallas, TX',
    annualGrossIncome: 180000,
    annualGrossTax: 134172,
    annualNetIncome: 125928,
    monthlyGrossIncome: 15000,
    housing: 3000,
    utilities: 1000,
    monthlyNetIncome: 6494,
    costIndex: 123.5,
    taxRate: 25.4,
    savingsRate: 28.2,
  },
]

const calculateMetrics = (data: (typeof INITIAL_LOCATIONS)[number]) => {
  const monthlyGross = data.annualGrossIncome / 12
  const taxRate = (data.annualGrossTax / data.annualGrossIncome) * 100
  const monthlyTax = data.annualGrossTax / 12
  const monthlyNet = monthlyGross - monthlyTax - data.housing - data.utilities
  const savingsRate = (monthlyNet / monthlyGross) * 100

  return {
    ...data,
    monthlyGrossIncome: monthlyGross,
    monthlyNetIncome: monthlyNet,
    taxRate,
    savingsRate,
  }
}

const LocationComparison = () => {
  const {
    items: locations,
    createAsync,
    deleteAsync,
  } = useIndexedDBCollection<{
    id: string
    place: string
    annualGrossIncome: number
    annualGrossTax: number
    annualNetIncome: number
    monthlyGrossIncome: number
    housing: number
    utilities: number
    monthlyNetIncome: number
    costIndex: number
    taxRate: number
    savingsRate: number
  }>({
    collectionKey: 'locations',
    initialData: [...INITIAL_LOCATIONS],
  })

  const [newLocation, setNewLocation] = useState({
    place: '',
    annualGrossIncome: 0,
    annualGrossTax: 0,
    annualNetIncome: 0,
    monthlyGrossIncome: 0,
    housing: 0,
    utilities: 0,
    monthlyNetIncome: 0,
    costIndex: 100,
    taxRate: 0,
    savingsRate: 0,
  })

  const handleInputChange = (field: string, value: string) => {
    let val: number | string

    if (field !== 'place') {
      val = Number.parseFloat(value) || 0
    }

    setNewLocation((prev) => {
      const updated = { ...prev, [field]: val, id: crypto.randomUUID() }
      return calculateMetrics(updated)
    })
  }

  const addLocation = async () => {
    if (newLocation.place) {
      await createAsync(newLocation)
      setNewLocation({
        place: '',
        annualGrossIncome: 0,
        annualGrossTax: 0,
        annualNetIncome: 0,
        monthlyGrossIncome: 0,
        housing: 0,
        utilities: 0,
        monthlyNetIncome: 0,
        costIndex: 100,
        taxRate: 0,
        savingsRate: 0,
      })
    }
  }

  const removeLocation = async (id: string) => {
    await deleteAsync(id)
  }

  const getChartData = (metric: keyof (typeof INITIAL_LOCATIONS)[number]) => {
    return locations.map((loc) => ({
      name: loc.place,
      value: loc[metric],
    }))
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <Tabs defaultValue="table">
        <TabsList className="mb-4">
          <TabsTrigger value="table">Data Table</TabsTrigger>
          <TabsTrigger value="charts">Charts</TabsTrigger>
          <TabsTrigger value="col">Cost of Living</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <Card>
            <CardHeader>
              <CardTitle>Location Financial Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Location</th>
                      <th className="text-right p-2">Annual Gross</th>
                      <th className="text-right p-2">Tax Rate</th>
                      <th className="text-right p-2">Monthly Net</th>
                      <th className="text-right p-2">Savings Rate</th>
                      <th className="text-right p-2">Housing</th>
                      <th className="text-right p-2">Utilities</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc) => (
                      <tr key={crypto.getRandomValues(new Uint16Array(1))[0]} className="border-b">
                        <td className="p-2">{loc.place}</td>
                        <td className="text-right p-2">{formatCurrency(loc.annualGrossIncome)}</td>
                        <td className="text-right p-2">{formatPercent(loc.taxRate)}</td>
                        <td className="text-right p-2">{formatCurrency(loc.monthlyNetIncome)}</td>
                        <td className="text-right p-2">{formatPercent(loc.savingsRate)}</td>
                        <td className="text-right p-2">{formatCurrency(loc.housing)}</td>
                        <td className="text-right p-2">{formatCurrency(loc.utilities)}</td>
                        <td className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeLocation(loc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                    <tr>
                      <td className="p-2">
                        <Input
                          placeholder="Location"
                          value={newLocation.place}
                          onChange={(e) => handleInputChange('place', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="Annual Gross"
                          value={newLocation.annualGrossIncome || ''}
                          onChange={(e) => handleInputChange('annualGrossIncome', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="Tax Rate"
                          value={newLocation.taxRate || ''}
                          onChange={(e) => handleInputChange('taxRate', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="Monthly Net"
                          value={newLocation.monthlyNetIncome || ''}
                          disabled
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="Savings Rate"
                          value={newLocation.savingsRate || ''}
                          disabled
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="Housing"
                          value={newLocation.housing || ''}
                          onChange={(e) => handleInputChange('housing', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="Utilities"
                          value={newLocation.utilities || ''}
                          onChange={(e) => handleInputChange('utilities', e.target.value)}
                        />
                      </td>
                      <td className="p-2">
                        <Button variant="ghost" size="icon" onClick={addLocation}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="charts">
          <Card>
            <CardHeader>
              <CardTitle>Financial Metrics Visualization</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="h-80">
                  <p className="mb-2 font-medium">Monthly Net Income Comparison</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData('monthlyNetIncome')}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => formatCurrency(value as string)} />
                      <Bar dataKey="value" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-80">
                  <p className="mb-2 font-medium">Tax Rate Comparison</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData('taxRate')}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={formatPercent} />
                      <Bar dataKey="value" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="h-80">
                  <p className="mb-2 font-medium">Savings Rate Comparison</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData('savingsRate')}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={formatPercent} />
                      <Bar dataKey="value" fill="#22c55e" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="col">
          <Card>
            <CardHeader>
              <CardTitle>Cost of Living Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="h-80">
                  <p className="mb-2 font-medium">Cost of Living Index (100 = National Average)</p>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getChartData('costIndex')}>
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={formatPercent} />
                      <Bar dataKey="value" fill="#8b5cf6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Location</th>
                        <th className="text-right p-2">Cost Index</th>
                        <th className="text-right p-2">Relative Purchasing Power</th>
                        <th className="text-right p-2">Equivalent Salary Needed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {locations.map((loc) => {
                        const baseLocation = locations[0]
                        const relativeCol = (baseLocation.costIndex / loc.costIndex) * 100
                        const equivalentSalary =
                          (loc.costIndex / baseLocation.costIndex) * baseLocation.annualGrossIncome

                        return (
                          <tr key={loc.id} className="border-b">
                            <td className="p-2">{loc.place}</td>
                            <td className="text-right p-2">{formatPercent(loc.costIndex)}</td>
                            <td className="text-right p-2">{formatPercent(relativeCol)}</td>
                            <td className="text-right p-2">{formatCurrency(equivalentSalary)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LocationComparison
