'use client'

import type { SyncableEntity } from '@hominem/ui'
import { useLocalData } from '@hominem/ui'
import { calculateTakeHome, type StateTaxCode, stateTaxRates } from '@hominem/data/finance-utils'
import { Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Slider } from '~/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'
import { formatCurrency, formatPercent } from '~/lib/number.utils'

const LocationTaxComparison = () => {
  const { supabase } = useSupabaseAuth()
  const [income, setIncome] = useState(100000)
  const [selectedStates, setSelectedStates] = useState<StateTaxCode[]>(['CA', 'TX'])
  const [showAddState, setShowAddState] = useState(false)
  const [newState, setNewState] = useState<StateTaxCode>('NY')

  const addState = () => {
    if (!selectedStates.includes(newState)) {
      setSelectedStates([...selectedStates, newState])
      setShowAddState(false)
    }
  }

  const removeState = (stateCode: StateTaxCode) => {
    if (selectedStates.length > 1) {
      setSelectedStates(selectedStates.filter((state) => state !== stateCode))
    }
  }

  // Find the state with highest take-home pay
  const calculations = selectedStates.map((state) => ({
    stateCode: state,
    calculation: calculateTakeHome(income, state),
  }))

  const bestTakeHome = calculations.reduce(
    (best, current) => (current.calculation.takeHome > best.calculation.takeHome ? current : best),
    calculations[0]
  )

  // For charts tab
  const getTaxChartData = () => {
    return selectedStates.map((stateCode) => {
      const calculation = calculateTakeHome(income, stateCode)
      return {
        name: stateTaxRates[stateCode].name,
        'Federal Tax': calculation.federalTax,
        'State Tax': calculation.stateTax,
        'Take-Home': calculation.takeHome,
      }
    })
  }

  const getRateChartData = () => {
    return selectedStates.map((stateCode) => {
      const calculation = calculateTakeHome(income, stateCode)
      return {
        name: stateTaxRates[stateCode].name,
        'Effective Tax Rate': calculation.effectiveTaxRate,
      }
    })
  }

  // For cost of living tab
  interface LocationData extends SyncableEntity {
    place: string
    annualGrossIncome: number
    annualNetIncome: number
    monthlyGrossIncome: number
    housing: number
    utilities: number
    monthlyNetIncome: number
    costIndex: number
    taxRate: number
    savingsRate: number
  }

  const {
    items: locations,
    createAsync,
    deleteAsync,
  } = useLocalData<LocationData>({
    queryKey: ['locations'],
    endpoint: '/api/locations',
    storeName: 'locations',
    initialData: [],
    supabaseClient: supabase,
  })

  const [newLocation, setNewLocation] = useState({
    place: '',
    annualGrossIncome: income,
    annualNetIncome: 0,
    monthlyGrossIncome: income / 12,
    housing: 0,
    utilities: 0,
    monthlyNetIncome: 0,
    costIndex: 100,
    taxRate: 0,
    savingsRate: 0,
  })

  const handleInputChange = (field: string, value: string) => {
    let val: number | string = value

    if (field !== 'place') {
      val = Number.parseFloat(value) || 0
    }

    setNewLocation((prev) => {
      const updated = { ...prev, [field]: val, id: crypto.randomUUID() }
      return calculateCOLMetrics(updated)
    })
  }

  const calculateCOLMetrics = (data: typeof newLocation) => {
    const monthlyGross = data.annualGrossIncome / 12
    const monthlyNet = data.monthlyNetIncome
    const savingsRate = ((monthlyNet - data.housing - data.utilities) / monthlyGross) * 100

    return {
      ...data,
      monthlyGrossIncome: monthlyGross,
      savingsRate,
    }
  }

  const addLocation = async () => {
    if (newLocation.place) {
      await createAsync(newLocation)
      setNewLocation({
        ...newLocation,
        place: '',
        housing: 0,
        utilities: 0,
      })
    }
  }

  const removeLocation = async (id: string) => {
    await deleteAsync(id)
  }

  return (
    <Tabs defaultValue="tax-comparison" className="w-full max-w-6xl mx-auto">
      <TabsList className="mb-4">
        <TabsTrigger value="tax-comparison">Tax Comparison</TabsTrigger>
        <TabsTrigger value="tax-charts">Tax Charts</TabsTrigger>
        <TabsTrigger value="cost-of-living">Cost of Living</TabsTrigger>
      </TabsList>

      <TabsContent value="tax-comparison">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Location Tax Comparison</CardTitle>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {selectedStates.map((stateCode) => {
                  const calculation = calculateTakeHome(income, stateCode)
                  const isHighestTakeHome = stateCode === bestTakeHome.stateCode

                  return (
                    <div
                      key={stateCode}
                      className={`
                        space-y-3 bg-gray-50 p-4 rounded-lg border-2
                        ${isHighestTakeHome ? 'border-green-500' : 'border-transparent'}
                      `}
                    >
                      <div className="flex justify-between items-start">
                        <div className="text-lg font-semibold">{stateTaxRates[stateCode].name}</div>
                        {selectedStates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeState(stateCode)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            &times;
                          </button>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 italic mb-2">
                        {stateTaxRates[stateCode].notes}
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Federal Tax:</span>
                          <div className="text-right">
                            <div className="text-red-600">
                              -{formatCurrency(calculation.federalTax)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ({formatPercent(calculation.federalTax / income)} of gross)
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-600">State Tax:</span>
                          <div className="text-right">
                            <div className="text-red-600">
                              -{formatCurrency(calculation.stateTax)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ({formatPercent(calculation.stateTax / income)} of gross)
                            </div>
                          </div>
                        </div>

                        <div className="h-px bg-gray-200 my-2" />

                        <div className="flex justify-between font-medium">
                          <span>Take-Home Pay:</span>
                          <div className="text-right">
                            <div
                              className={`text-lg ${isHighestTakeHome ? 'text-green-600 font-bold' : 'text-green-500'}`}
                            >
                              {formatCurrency(calculation.takeHome)}
                            </div>
                            <div className="text-xs text-gray-500">
                              Effective Tax Rate: {calculation.effectiveTaxRate.toFixed(1)}%
                            </div>
                          </div>
                        </div>

                        {isHighestTakeHome && selectedStates.length > 1 && (
                          <div className="mt-2 text-center text-sm text-green-600 font-medium">
                            Best take-home pay
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}

                {showAddState ? (
                  <div className="space-y-3 bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                    <div className="text-lg font-semibold mb-2">Add State</div>
                    <Select value={newState} onValueChange={(v: StateTaxCode) => setNewState(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(stateTaxRates)
                          .filter(([code]) => !selectedStates.includes(code as StateTaxCode))
                          .map(([code, info]) => (
                            <SelectItem key={code} value={code}>
                              {info.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" onClick={addState}>
                        Add
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddState(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddState(true)}
                    className="flex items-center justify-center h-full min-h-[200px] bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:bg-gray-100 transition-colors"
                    disabled={Object.keys(stateTaxRates).length <= selectedStates.length}
                  >
                    <div className="text-gray-500">
                      <div className="text-2xl mb-2">+</div>
                      <div>Add State</div>
                    </div>
                  </button>
                )}
              </div>

              {selectedStates.length > 1 && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="font-semibold mb-1">Highest Take-Home Pay</div>
                    <div className="text-lg">
                      {stateTaxRates[bestTakeHome.stateCode].name}:{' '}
                      {formatCurrency(bestTakeHome.calculation.takeHome)}
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      {calculations
                        .filter((c) => c.stateCode !== bestTakeHome.stateCode)
                        .map((c) => {
                          const difference =
                            bestTakeHome.calculation.takeHome - c.calculation.takeHome
                          return (
                            <div key={c.stateCode} className="text-sm">
                              <span className="font-medium">{formatCurrency(difference)}</span> more
                              in{' '}
                              <span className="font-medium">
                                {stateTaxRates[bestTakeHome.stateCode].name}
                              </span>{' '}
                              than{' '}
                              <span className="font-medium">{stateTaxRates[c.stateCode].name}</span>
                              <div className="text-xs text-gray-600">
                                ({formatPercent(difference / c.calculation.takeHome, 1)} more)
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="tax-charts">
        <Card>
          <CardHeader>
            <CardTitle>Tax Visualization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium mb-2" htmlFor="income-chart">
                  Annual Income: {formatCurrency(income)}
                </label>
                <Slider
                  name="income-chart"
                  defaultValue={[income]}
                  max={500000}
                  step={1000}
                  onValueChange={(value) => setIncome(value[0])}
                  className="w-full"
                />
              </div>

              <div className="h-80">
                <p className="mb-2 font-medium">Tax Breakdown Comparison</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getTaxChartData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="Federal Tax" stackId="a" fill="#ef4444" />
                    <Bar dataKey="State Tax" stackId="a" fill="#f97316" />
                    <Bar dataKey="Take-Home" stackId="a" fill="#22c55e" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="h-80">
                <p className="mb-2 font-medium">Effective Tax Rate Comparison</p>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={getRateChartData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="Effective Tax Rate" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="cost-of-living">
        <Card>
          <CardHeader>
            <CardTitle>Cost of Living Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Location</th>
                      <th className="text-right p-2">Annual Income</th>
                      <th className="text-right p-2">Monthly Net</th>
                      <th className="text-right p-2">Housing</th>
                      <th className="text-right p-2">Utilities</th>
                      <th className="text-right p-2">Savings Rate</th>
                      <th className="text-right p-2">Cost Index</th>
                      <th className="p-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {locations.map((loc) => (
                      <tr key={loc.id} className="border-b">
                        <td className="p-2">{loc.place}</td>
                        <td className="text-right p-2">{formatCurrency(loc.annualGrossIncome)}</td>
                        <td className="text-right p-2">{formatCurrency(loc.monthlyNetIncome)}</td>
                        <td className="text-right p-2">{formatCurrency(loc.housing)}</td>
                        <td className="text-right p-2">{formatCurrency(loc.utilities)}</td>
                        <td className="text-right p-2">{formatPercent(loc.savingsRate)}</td>
                        <td className="text-right p-2">{formatPercent(loc.costIndex / 100)}</td>
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
                        <Input type="number" placeholder="Annual Income" value={income} disabled />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="Monthly Net"
                          value={calculateTakeHome(income, 'CA').takeHome / 12}
                          onChange={(e) => handleInputChange('monthlyNetIncome', e.target.value)}
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
                        <Input
                          type="number"
                          placeholder="Savings Rate"
                          value={newLocation.savingsRate.toFixed(1) || ''}
                          disabled
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          type="number"
                          placeholder="Cost Index"
                          value={newLocation.costIndex || ''}
                          onChange={(e) => handleInputChange('costIndex', e.target.value)}
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

              {locations.length > 0 && (
                <div className="space-y-8">
                  <div className="h-80">
                    <p className="mb-2 font-medium">Monthly Housing Cost Comparison</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={locations.map((loc) => ({
                          name: loc.place,
                          Housing: loc.housing,
                          Utilities: loc.utilities,
                        }))}
                      >
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Bar dataKey="Housing" fill="#3b82f6" />
                        <Bar dataKey="Utilities" fill="#8b5cf6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="h-80">
                    <p className="mb-2 font-medium">Savings Rate Comparison</p>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={locations.map((loc) => ({
                          name: loc.place,
                          'Savings Rate': loc.savingsRate,
                        }))}
                      >
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip formatter={(value) => `${Number(value).toFixed(1)}%`} />
                        <Bar dataKey="Savings Rate" fill="#22c55e" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {locations.length > 1 && (
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="font-semibold mb-3 text-center">
                        Cost of Living Comparison
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {locations.slice(1).map((loc) => {
                          const baseLoc = locations[0]
                          const relativeCOL = loc.costIndex / baseLoc.costIndex
                          const equivalentSalary = baseLoc.annualGrossIncome * relativeCOL
                          const difference = equivalentSalary - baseLoc.annualGrossIncome

                          return (
                            <div key={loc.id} className="text-sm">
                              <div className="font-medium">
                                {loc.place} vs {baseLoc.place}:
                              </div>
                              <div>
                                Cost of living is {(relativeCOL * 100).toFixed(1)}%
                                {relativeCOL > 1 ? ' higher' : ' lower'}
                              </div>
                              <div>
                                {formatCurrency(baseLoc.annualGrossIncome)} in {baseLoc.place} is
                                equivalent to {formatCurrency(equivalentSalary)} in {loc.place}
                              </div>
                              {difference !== 0 && (
                                <div className={difference > 0 ? 'text-red-600' : 'text-green-600'}>
                                  Need to earn {formatCurrency(Math.abs(difference))}
                                  {difference > 0 ? ' more' : ' less'} in {loc.place}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

export default LocationTaxComparison
