import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card'
import { Skeleton } from '@hominem/ui/components/ui/skeleton'
import { useTimeSeriesData } from '~/lib/hooks/use-time-series'
import { formatCurrency } from '~/lib/number.utils'

interface AnalyticsStatisticsSummaryProps {
  dateFrom?: Date
  dateTo?: Date
  selectedAccount?: string
  selectedCategory?: string
  includeStats?: boolean
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
  })

  const stats = timeSeriesData?.stats

  if (!includeStats) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center font-normal text-base text-neutral-700">
            Statistics are disabled. Enable them in filters to see summary data.
          </div>
        </CardContent>
      </Card>
    )
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
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            {error.message || 'Unable to load statistics. Please try again later.'}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      {stats ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-neutral-900">
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              {/* Total Income Row */}
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-neutral-900">Total Income</div>
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
                  <div className="text-sm font-medium text-neutral-900">Total Expenses</div>
                  <div className="text-xs text-muted-foreground">
                    For period {stats.periodCovered}
                  </div>
                </div>
                <div className="text-xl font-bold text-red-600 font-mono">
                  {formatCurrency(stats.totalExpenses)}
                </div>
              </div>

              {/* Average Income Row */}
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-neutral-900">Average Income</div>
                  <div className="text-xs text-muted-foreground">Over {stats.count} months</div>
                </div>
                <div className="text-xl font-bold text-black font-mono">
                  {formatCurrency(stats.averageIncome)}
                </div>
              </div>

              {/* Average Expenses Row */}
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-neutral-900">Average Expenses</div>
                  <div className="text-xs text-muted-foreground">Over {stats.count} months</div>
                </div>
                <div className="text-xl font-bold text-red-600 font-mono">
                  {formatCurrency(stats.averageExpenses)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center font-normal text-base text-neutral-700">
              No statistics available. Try enabling stats in filters.
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
