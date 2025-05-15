import type { Dispatch, SetStateAction } from 'react'
import { useMemo } from 'react'
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

const INCOME_COLOR = '#ABF4B6'
const EXPENSES_COLOR = '#ef4444'

interface ChartDataPoint {
  name: string
  Spending: number
}

interface TimeSeriesDataPoint {
  date: string
  income: number
  expenses: number
}

interface AnalyticsChartDisplayProps {
  chartType: 'area' | 'bar'
  setChartType: Dispatch<SetStateAction<'area' | 'bar'>>
  isLoading: boolean
  error: Error | null
  chartData: ChartDataPoint[] | null | undefined
  timeSeriesData?: TimeSeriesDataPoint[]
}

export function AnalyticsChartDisplay({
  chartType,
  setChartType,
  timeSeriesData,
}: AnalyticsChartDisplayProps) {
  const incomeExpensesChartData = useMemo(() => {
    if (!timeSeriesData) return []
    return timeSeriesData.map((point) => ({
      name: point.date,
      Income: point.income,
      Expenses: Math.abs(point.expenses),
    }))
  }, [timeSeriesData])

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                <span>Trends</span>
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
            <div className="h-80 w-full max-w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartType === 'area' ? (
                  <AreaChart
                    data={incomeExpensesChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0.2} />
                      </linearGradient>
                      <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={EXPENSES_COLOR} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={EXPENSES_COLOR} stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} width={80} />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="Income"
                      stroke={INCOME_COLOR}
                      fillOpacity={1}
                      fill="url(#colorIncome)"
                    />
                    <Area
                      type="monotone"
                      dataKey="Expenses"
                      stroke={EXPENSES_COLOR}
                      fillOpacity={1}
                      fill="url(#colorExpenses)"
                    />
                  </AreaChart>
                ) : (
                  <BarChart
                    data={incomeExpensesChartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} width={80} />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="Income" fill={INCOME_COLOR} />
                    <Bar dataKey="Expenses" fill={EXPENSES_COLOR} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
