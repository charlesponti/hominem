import { Card, CardContent } from '@hominem/ui/components/ui/card'
import { Skeleton } from '@hominem/ui/components/ui/skeleton'
import { Link, useNavigate } from 'react-router'
import { useTimeSeriesData } from '~/lib/hooks/use-time-series'
import { formatCurrency } from '~/lib/number.utils'
import type { RouterOutput } from '~/lib/trpc'
import { cn } from '~/lib/utils'

interface MonthlyBreakdownProps {
  dateFrom?: Date
  dateTo?: Date
  selectedAccount?: string
  selectedCategory?: string
  compareToPrevious?: boolean
  groupBy?: 'month' | 'week' | 'day'
  category?: string
  title: string
}

const DeltaIcon = ({ delta }: { delta: number }) => {
  if (delta > 0)
    return (
      <span className="text-red-500 mr-1" title="Increase">
        ▲
      </span>
    )
  if (delta < 0)
    return (
      <span className="text-green-500 mr-1" title="Decrease">
        ▼
      </span>
    )
  return <span className="text-muted-foreground mr-1">–</span>
}

function TrendsDelta({
  label,
  prevDate,
  currDate,
  delta,
  formatDateLabel,
  formatCurrency,
}: {
  label: string
  prevDate: string
  currDate: string
  delta: number
  formatDateLabel: (dateStr: string) => string
  formatCurrency: (n: number) => string
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <span className="font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {formatDateLabel(prevDate)} → {formatDateLabel(currDate)}
        </span>
      </div>
      <div className="flex items-center text-lg font-mono">
        <DeltaIcon delta={delta} />
        <span
          className={
            delta > 0 ? 'text-red-600' : delta < 0 ? 'text-green-600' : 'text-muted-foreground'
          }
        >
          {formatCurrency(Math.abs(delta))}
        </span>
      </div>
    </div>
  )
}

function TrendsContent({
  prevMonth,
  currMonth,
  formatDateLabel,
  formatCurrency,
}: {
  prevMonth: RouterOutput['finance']['analyze']['spendingTimeSeries']['data'][number]
  currMonth: RouterOutput['finance']['analyze']['spendingTimeSeries']['data'][number]
  formatDateLabel: (dateStr: string) => string
  formatCurrency: (n: number) => string
}) {
  const expensesDelta = (currMonth.expenses ?? 0) - (prevMonth.expenses ?? 0)
  return (
    <div className="rounded-lg border bg-muted/40 p-4 mb-4">
      <div className="grid grid-cols-1 gap-4">
        <TrendsDelta
          label="Largest spending change"
          prevDate={prevMonth.date}
          currDate={currMonth.date}
          delta={expensesDelta}
          formatDateLabel={formatDateLabel}
          formatCurrency={formatCurrency}
        />
      </div>
    </div>
  )
}

interface MonthItemProps {
  item: RouterOutput['finance']['analyze']['spendingTimeSeries']['data'][number]
  compareToPrevious: boolean
  formatDateLabel: (dateStr: string) => string
  category: string | undefined
}

function MonthTableRow({ item, compareToPrevious, formatDateLabel, category }: MonthItemProps) {
  const navigate = useNavigate()

  // Build the link to monthly analysis filtered by category
  const monthlyAnalyticsUrl = category
    ? `/analytics/monthly/${item.date}?category=${encodeURIComponent(category)}`
    : `/analytics/monthly/${item.date}`

  return (
    <tr
      className="border-b hover:bg-muted/50 cursor-pointer"
      onClick={() => navigate(monthlyAnalyticsUrl)}
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(monthlyAnalyticsUrl)
      }}
    >
      <td className="py-2">
        <Link
          to={monthlyAnalyticsUrl}
          className="hover:underline"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {formatDateLabel(item.date)}
        </Link>
      </td>
      <td className="text-right py-2">{item.count}</td>
      <td className="text-right py-2 font-mono">{formatCurrency(Math.abs(item.expenses))}</td>
      <td className="text-right py-2 font-mono">{formatCurrency(Math.abs(item.average))}</td>
      {compareToPrevious && (
        <td
          className={cn('text-right py-2 font-mono', {
            'text-red-500': item.trend?.directionExpenses === 'up',
            'text-green-500': item.trend?.directionExpenses === 'down',
          })}
        >
          {item.trend
            ? `${item.trend.directionExpenses === 'up' ? '+' : '-'}${item.trend.percentChangeExpenses}%`
            : '-'}
        </td>
      )}
    </tr>
  )
}

function MonthMobileItem({ item, compareToPrevious, formatDateLabel, category }: MonthItemProps) {
  const navigate = useNavigate()

  // Build the link to monthly analysis filtered by category
  const monthlyAnalyticsUrl = category
    ? `/analytics/monthly/${item.date}?category=${encodeURIComponent(category)}`
    : `/analytics/monthly/${item.date}`

  return (
    <button
      type="button"
      className="w-full text-left rounded-lg border p-4 shadow-sm bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
      onClick={() => navigate(monthlyAnalyticsUrl)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(monthlyAnalyticsUrl)
      }}
      aria-label={`View details for ${formatDateLabel(item.date)}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-muted-foreground">
          {formatDateLabel(item.date)}
        </span>
        <Link
          to={monthlyAnalyticsUrl}
          className="text-primary underline text-xs ml-2"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          Details
        </Link>
      </div>
      <div className="flex flex-wrap gap-y-1 text-sm">
        <div className="flex justify-between w-full">
          Transactions: <span className="font-mono">{item.count}</span>
        </div>
        <div className="flex justify-between w-full">
          Total Spent: <span className="font-mono">{formatCurrency(Math.abs(item.expenses))}</span>
        </div>
        <div className="flex justify-between w-full">
          Average: <span className="font-mono">{formatCurrency(Math.abs(item.average))}</span>
        </div>
        {compareToPrevious && (
          <div className="flex justify-between w-full">
            Spending Trend:{' '}
            <span
              className={cn('font-mono', {
                'text-red-500': item.trend?.directionExpenses === 'up',
                'text-green-500': item.trend?.directionExpenses === 'down',
              })}
            >
              {item.trend
                ? `${item.trend.directionExpenses === 'up' ? '+' : '-'}${item.trend.percentChangeExpenses}%`
                : '-'}
            </span>
          </div>
        )}
      </div>
    </button>
  )
}

export function MonthlyBreakdown({
  dateFrom,
  dateTo,
  selectedAccount,
  selectedCategory,
  compareToPrevious = false,
  groupBy = 'month',
  category,
  title,
}: MonthlyBreakdownProps) {
  const { data, isLoading, error, formatDateLabel } = useTimeSeriesData({
    dateFrom,
    dateTo,
    account: selectedAccount,
    category: selectedCategory,
    compareToPrevious,
    groupBy,
  })

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !data || data.data.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            {error ? 'Error loading data' : 'No data available for the selected period'}
          </div>
        </CardContent>
      </Card>
    )
  }

  const sortedData = [...data.data].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  // Show trends comparison if enabled and we have at least 2 data points
  const showTrends = compareToPrevious && sortedData.length >= 2
  const prevMonth = showTrends ? sortedData[1] : null
  const currMonth = showTrends ? sortedData[0] : null

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            {category && (
              <span className="text-sm text-muted-foreground">Filtered by: {category}</span>
            )}
          </div>

          {showTrends && prevMonth && currMonth && (
            <TrendsContent
              prevMonth={prevMonth}
              currMonth={currMonth}
              formatDateLabel={formatDateLabel}
              formatCurrency={formatCurrency}
            />
          )}

          {/* Desktop Table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 font-medium">Period</th>
                  <th className="text-right py-2 font-medium">Transactions</th>
                  <th className="text-right py-2 font-medium">Total Spent</th>
                  <th className="text-right py-2 font-medium">Average</th>
                  {compareToPrevious && <th className="text-right py-2 font-medium">Trend</th>}
                </tr>
              </thead>
              <tbody>
                {sortedData.map((item) => (
                  <MonthTableRow
                    key={item.date}
                    item={item}
                    compareToPrevious={compareToPrevious}
                    formatDateLabel={formatDateLabel}
                    category={category}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {sortedData.map((item) => (
              <MonthMobileItem
                key={item.date}
                item={item}
                compareToPrevious={compareToPrevious}
                formatDateLabel={formatDateLabel}
                category={category}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
