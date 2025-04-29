import type { TimeSeriesStats } from '@hominem/utils/types'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'

interface AnalyticsStatisticsSummaryProps {
  stats: TimeSeriesStats | null | undefined
  formatCurrency: (value: number | string) => string
}

export function AnalyticsStatisticsSummary({
  stats,
  formatCurrency,
}: AnalyticsStatisticsSummaryProps) {
  return (
    <>
      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Total Spending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.formattedTotal}</div>
              <p className="text-sm text-muted-foreground mt-1">For period {stats.periodCovered}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Average Per Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{formatCurrency(stats.average)}</div>
              <p className="text-sm text-muted-foreground mt-1">Over {stats.count} months</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Spending Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col">
                <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                  <div>
                    <div className="text-sm text-muted-foreground">Minimum</div>
                    <div className="text-lg font-medium">{formatCurrency(stats.min)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Maximum</div>
                    <div className="text-lg font-medium">{formatCurrency(stats.max)}</div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-sm text-muted-foreground">Median</div>
                  <div className="text-lg font-medium">{formatCurrency(stats.median)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              No statistics available. Try enabling stats in filters.
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}
