import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { formatCurrency } from '~/lib/finance.utils'
import { useTimeSeriesData } from '~/lib/hooks/use-time-series'

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
    const skeletonItems = Array.from({ length: 4 }, (_, i) => i)
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {skeletonItems.map((item) => (
          <Card key={`stats-skeleton-${item}`}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-neutral-900">
                Total Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black font-mono">
                {formatCurrency(stats.totalIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-normal">
                For period {stats.periodCovered}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-neutral-900">
                Total Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 font-mono">
                {formatCurrency(stats.totalExpenses)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-normal">
                For period {stats.periodCovered}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-neutral-900">
                Average Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-black font-mono">
                {formatCurrency(stats.averageIncome)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-normal">
                Over {stats.count} months
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-neutral-900">
                Average Expenses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600 font-mono">
                {formatCurrency(stats.averageExpenses)}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-normal">
                Over {stats.count} months
              </p>
            </CardContent>
          </Card>
        </div>
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
