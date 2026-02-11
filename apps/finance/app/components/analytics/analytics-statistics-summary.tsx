import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card';
import { Skeleton } from '@hominem/ui/components/ui/skeleton';

import { useTimeSeriesData } from '~/lib/hooks/use-time-series';
import { formatCurrency } from '~/lib/number.utils';

interface AnalyticsStatisticsSummaryProps {
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  selectedAccount?: string | undefined;
  selectedCategory?: string | undefined;
  includeStats?: boolean | undefined;
}

export function AnalyticsStatisticsSummary({
  dateFrom,
  dateTo,
  selectedAccount,
  selectedCategory,
  includeStats = true,
}: AnalyticsStatisticsSummaryProps) {
  const {
    data: timeSeriesData,
    isLoading,
    error,
  } = useTimeSeriesData({
    dateFrom,
    dateTo,
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    category: selectedCategory || undefined,
    includeStats,
    compareToPrevious: false,
    groupBy: 'month',
  });

  const stats = timeSeriesData?.stats;

  if (!includeStats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center font-normal text-base text-secondary-foreground">
            Statistics are disabled. Enable them in filters to see summary data.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            {['total-income', 'total-expenses', 'average-income', 'average-expenses'].map((key) => (
              <div key={`stats-skeleton-${key}`} className="flex justify-between items-center">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="size-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            {error.message || 'Unable to load statistics. Retry later.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {stats ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-secondary-foreground">
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              {/* Total Income Row */}
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-secondary-foreground">Total Income</div>
                  <div className="text-xs text-muted-foreground">
                    For period {stats.periodCovered}
                  </div>
                </div>
                <div className="text-xl font-bold text-black font-mono">
                  {formatCurrency(stats.totalIncome)}
                </div>
              </div>

              {/* Total Expenses Row */}
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-secondary-foreground">Total Expenses</div>
                  <div className="text-xs text-muted-foreground">
                    For period {stats.periodCovered}
                  </div>
                </div>
                <div className="text-xl font-bold text-destructive font-mono">
                  {formatCurrency(stats.totalExpenses)}
                </div>
              </div>

              {/* Average Income Row */}
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-secondary-foreground">Average Income</div>
                  <div className="text-xs text-muted-foreground">Over {stats.count} months</div>
                </div>
                <div className="text-xl font-bold text-black font-mono">
                  {formatCurrency(stats.averageIncome)}
                </div>
              </div>

              {/* Average Expenses Row */}
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-secondary-foreground">Average Expenses</div>
                  <div className="text-xs text-muted-foreground">Over {stats.count} months</div>
                </div>
                <div className="text-xl font-bold text-destructive font-mono">
                  {formatCurrency(stats.averageExpenses)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center font-normal text-base text-secondary-foreground">
              No statistics available. Try enabling stats in filters.
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
