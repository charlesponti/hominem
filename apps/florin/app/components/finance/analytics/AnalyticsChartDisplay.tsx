import type { Dispatch, SetStateAction } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatCurrency } from '~/lib/finance'

interface ChartDataPoint {
  name: string
  Spending: number
}

interface AnalyticsChartDisplayProps {
  chartType: 'area' | 'bar'
  setChartType: Dispatch<SetStateAction<'area' | 'bar'>>
  isLoading: boolean
  error: Error | null
  chartData: ChartDataPoint[] | null | undefined
}

export function AnalyticsChartDisplay({
  chartType,
  setChartType,
  isLoading,
  error,
  chartData,
}: AnalyticsChartDisplayProps) {
  return (
    <>
      <div className="space-y-4">
        {error ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-500">{error.message}</div>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">Loading chart data...</div>
            </CardContent>
          </Card>
        ) : chartData && chartData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="flex justify-between items-center">
                  {/* Keep TabsList in the parent component */}
                  <span>Spending Trends</span>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant={chartType === 'area' ? 'default' : 'outline'}
                      onClick={() => setChartType('area')}
                      size="sm"
                    >
                      Area
                    </Button>
                    <Button
                      variant={chartType === 'bar' ? 'default' : 'outline'}
                      onClick={() => setChartType('bar')}
                      size="sm"
                    >
                      Bar
                    </Button>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'area' ? (
                    <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#8884d8" stopOpacity={0.2} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} width={80} />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="Spending"
                        stroke="#8884d8"
                        fillOpacity={1}
                        fill="url(#colorSpending)"
                      />
                    </AreaChart>
                  ) : (
                    <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} width={80} />
                      <CartesianGrid strokeDasharray="3 3" />
                      <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="Spending" fill="#8884d8" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                No data available. Please adjust your filters and try again.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  )
}
