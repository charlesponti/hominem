import type { TimeSeriesDataPoint } from '@hominem/hono-rpc/types/finance.types';

import { Button } from '@hominem/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card';
import { subMonths } from 'date-fns';
import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { useTimeSeriesData } from '~/lib/hooks/use-time-series';
import { formatCurrency } from '~/lib/number.utils';

const SPENDING_COLOR = '#ef4444';

interface AccountSpendingChartProps {
  accountId: string;
  accountName: string;
}

export function AccountSpendingChart({ accountId, accountName }: AccountSpendingChartProps) {
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Get last 6 months of data for this specific account - memoize to prevent infinite re-renders
  const { dateFrom, dateTo } = useMemo(() => {
    const now = new Date();
    return {
      dateFrom: subMonths(now, 6),
      dateTo: now,
    };
  }, []);

  const {
    data: timeSeriesData,
    isLoading,
    error,
    formatDateLabel,
  } = useTimeSeriesData({
    dateFrom,
    dateTo,
    account: accountId, // Filter by this specific account
    includeStats: false,
    compareToPrevious: false,
    groupBy: 'month',
    enabled: !!accountId, // Only fetch if accountId is provided
  });

  const chartData = useMemo(() => {
    if (!Array.isArray(timeSeriesData?.data)) return [];
    return timeSeriesData.data.map((point: TimeSeriesDataPoint) => ({
      name: formatDateLabel(point.date),
      Spending: Math.abs(point.expenses),
    }));
  }, [timeSeriesData, formatDateLabel]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full flex items-center justify-center">
            <div className="text-muted-foreground">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('AccountSpendingChart error:', error);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full flex items-center justify-center">
            <div className="text-destructive">
              Failed to load chart data
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs mt-2 text-muted-foreground">Error: {error.message}</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Spending</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full flex items-center justify-center">
            <div className="text-muted-foreground">No spending data available</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
            <span>Monthly Spending - {accountName}</span>
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
              <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SPENDING_COLOR} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={SPENDING_COLOR} stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} width={80} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Spending']}
                  labelStyle={{ color: '#000' }}
                />
                <Area
                  type="monotone"
                  dataKey="Spending"
                  stroke={SPENDING_COLOR}
                  fillOpacity={1}
                  fill="url(#colorSpending)"
                />
              </AreaChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => formatCurrency(value)} width={80} />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Spending']}
                  labelStyle={{ color: '#000' }}
                />
                <Bar dataKey="Spending" fill={SPENDING_COLOR} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
