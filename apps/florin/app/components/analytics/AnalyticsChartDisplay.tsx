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
import { Skeleton } from '~/components/ui/skeleton'
import { formatCurrency } from '~/lib/finance.utils'
import { useTimeSeriesData } from '~/lib/hooks/use-time-series'

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
  dateFrom?: Date
  dateTo?: Date
  selectedAccount?: string
  selectedCategory?: string
  groupBy?: 'month' | 'week' | 'day'
  compareToPrevious?: boolean
}

// Helper function to format date based on whether it's this year
function formatChartDate(dateString: string): string {
  // Parse YYYY-MM format explicitly to avoid timezone issues
  const [yearStr, monthStr] = dateString.split('-')
  const year = Number.parseInt(yearStr, 10)
  const month = Number.parseInt(monthStr, 10) - 1 // JavaScript months are 0-indexed

  const currentYear = new Date().getFullYear()

  if (year === currentYear) {
    // This year - show month name only
    const date = new Date(year, month, 1)
    return date.toLocaleDateString('en-US', { month: 'short' })
  }

  // Other years - show month and year like "Dec '24"
  const date = new Date(year, month, 1)
  const monthName = date.toLocaleDateString('en-US', { month: 'short' })
  const yearShort = year.toString().slice(-2) // Get last 2 digits
  return `${monthName} '${yearShort}`
}

// Helper function to adjust date range to ensure full month is included
function adjustDateRange(
  dateFrom?: Date,
  dateTo?: Date
): { adjustedDateFrom?: Date; adjustedDateTo?: Date } {
  if (!dateFrom || !dateTo) {
    return { adjustedDateFrom: dateFrom, adjustedDateTo: dateTo }
  }

  const now = new Date()
  const isCurrentMonth =
    dateTo.getMonth() === now.getMonth() && dateTo.getFullYear() === now.getFullYear()

  let adjustedDateTo = dateTo

  // If dateTo is in the current month, extend it to the end of the month
  if (isCurrentMonth) {
    adjustedDateTo = new Date(dateTo.getFullYear(), dateTo.getMonth() + 1, 0) // Last day of the month
  }

  return { adjustedDateFrom: dateFrom, adjustedDateTo }
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
