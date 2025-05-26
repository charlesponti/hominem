import type { TimeSeriesStats } from '@hominem/utils/types'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { formatCurrency } from '~/lib/finance.utils'

interface AnalyticsStatisticsSummaryProps {
  stats: TimeSeriesStats | null | undefined
}

export function AnalyticsStatisticsSummary({ stats }: AnalyticsStatisticsSummaryProps) {
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
