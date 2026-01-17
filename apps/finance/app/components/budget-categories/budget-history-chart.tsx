import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { trpc } from '~/lib/trpc'

interface BudgetHistoryChartProps {
  historyMonths?: number
}

export function BudgetHistoryChart({ historyMonths = 6 }: BudgetHistoryChartProps) {
  const {
    data: historyData,
    isLoading,
    error,
  } = trpc.finance.budget.history.useQuery({ months: historyMonths })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Adherence Over Time ({historyMonths} Months)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] md:h-[400px] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full size-8 border-b-2 border-gray-900 mx-auto" />
            <p className="mt-2 text-sm text-gray-600">Loading history data...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Adherence Over Time ({historyMonths} Months)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] md:h-[400px] flex items-center justify-center">
          <div className="text-center text-red-600">
            <p>Error loading history data</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Adherence Over Time ({historyMonths} Months)</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] md:h-[400px]">
        {historyData && historyData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
              <Legend />
              <Line
                type="monotone"
                dataKey="budgeted"
                stroke="#8884d8"
                activeDot={{ r: 8 }}
                name="Total Budgeted"
              />
              <Line
                type="monotone"
                dataKey="actual"
                stroke="#82ca9d"
                name="Total Actual Spending"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p>No historical data available for the selected period.</p>
        )}
      </CardContent>
    </Card>
  )
}
