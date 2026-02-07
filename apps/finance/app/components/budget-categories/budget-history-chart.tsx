import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card';
import { LoadingSpinner } from '@hominem/ui/components/ui/loading-spinner';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useBudgetHistory } from '~/lib/hooks/use-budget';

interface BudgetHistoryChartProps {
  historyMonths?: number;
}

export function BudgetHistoryChart({ historyMonths = 6 }: BudgetHistoryChartProps) {
  const { data: historyData, isLoading, error } = useBudgetHistory({ months: historyMonths });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Adherence Over Time ({historyMonths} Months)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] md:h-[400px] flex items-center justify-center">
          <div className="text-center">
            <LoadingSpinner size="md" className="mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Loading history data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget Adherence Over Time ({historyMonths} Months)</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] md:h-[400px] flex items-center justify-center">
          <div className="text-center text-destructive">
            <p>Error loading history data</p>
            <p className="text-sm">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Adherence Over Time ({historyMonths} Months)</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px] md:h-[400px]">
        {historyData && Array.isArray(historyData) && historyData.length > 0 ? (
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
  );
}
