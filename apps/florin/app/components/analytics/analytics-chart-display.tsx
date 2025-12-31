import { Button } from '@hominem/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card'
import { Skeleton } from '@hominem/ui/components/ui/skeleton'
import type { Dispatch, SetStateAction } from 'react'
import { useId, useMemo } from 'react'
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
import { useTimeSeriesData } from '~/lib/hooks/use-time-series'
import { formatCurrency } from '~/lib/number.utils'
import { adjustDateRange, formatChartDate } from '@hominem/utils/dates'

const INCOME_COLOR = '#ABF4B6'
const EXPENSES_COLOR = '#ef4444'

interface AnalyticsChartDisplayProps {
  chartType: 'area' | 'bar'
  setChartType: Dispatch<SetStateAction<'area' | 'bar'>>
  dateFrom?: Date
  dateTo?: Date
  selectedAccount?: string
  selectedCategory?: string
  groupBy?: 'month' | 'week' | 'day'
  compareToPrevious?: boolean
}

export function AnalyticsChartDisplay({
  chartType,
  setChartType,
  dateFrom,
  dateTo,
  selectedAccount,
  selectedCategory,
  groupBy = 'month',
  compareToPrevious = false,
}: AnalyticsChartDisplayProps) {
  // Adjust date range to ensure full month is included
  const { adjustedDateFrom, adjustedDateTo } = adjustDateRange(dateFrom, dateTo)

  // Generate unique IDs for gradient elements
  const incomeGradientId = useId()
  const expensesGradientId = useId()

  const {
    data: timeSeriesData,
    isLoading,
    error,
  } = useTimeSeriesData({
    dateFrom: adjustedDateFrom,
    dateTo: adjustedDateTo,
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    category: selectedCategory || undefined,
    includeStats: false,
    compareToPrevious,
    groupBy,
  })

  const incomeExpensesChartData = useMemo(() => {
    if (!timeSeriesData?.data) return []
    return timeSeriesData.data.map((point) => ({
      name: formatChartDate(point.date),
      Income: point.income,
      Expenses: Math.abs(point.expenses),
    }))
  }, [timeSeriesData?.data])

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
              <span>Trends</span>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full max-w-full">
            <Skeleton className="h-full w-full" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full max-w-full flex items-center justify-center">
            <div className="text-center text-red-500">
              {error.message || 'Unable to load chart data. Please try again later.'}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!incomeExpensesChartData.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full max-w-full flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              No data available for the selected period
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
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
                    <linearGradient id={incomeGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id={expensesGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={EXPENSES_COLOR} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={EXPENSES_COLOR} stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis
                    className="text-xs"
                    tickFormatter={(value) => formatCurrency(value)}
                    width={80}
                  />
                  <CartesianGrid strokeDasharray="3 3" />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="Income"
                    stroke={INCOME_COLOR}
                    fillOpacity={1}
                    fill={`url(#${incomeGradientId})`}
                  />
                  <Area
                    type="monotone"
                    dataKey="Expenses"
                    stroke={EXPENSES_COLOR}
                    fillOpacity={1}
                    fill={`url(#${expensesGradientId})`}
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
  )
}
