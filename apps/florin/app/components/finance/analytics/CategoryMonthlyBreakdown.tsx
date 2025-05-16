import type { TimeSeriesDataPoint } from '@hominem/utils/types'
import { Link, useNavigate } from 'react-router'
import { formatCurrency } from '~/lib/finance'
import { cn } from '~/lib/utils'

interface CategoryMonthlyBreakdownProps {
  data: TimeSeriesDataPoint[] | undefined
  compareToPrevious: boolean
  formatDateLabel: (dateStr: string) => string
  category: string | undefined
}

const DeltaIcon = ({ delta }: { delta: number }) => {
  if (delta > 0)
    return (
      <span className="text-red-500 mr-1" aria-label="Increase">
        ▲
      </span>
    )
  if (delta < 0)
    return (
      <span className="text-green-500 mr-1" aria-label="Decrease">
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
  prevMonth: TimeSeriesDataPoint
  currMonth: TimeSeriesDataPoint
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
  item: TimeSeriesDataPoint
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

export function CategoryMonthlyBreakdown({
  data,
  compareToPrevious,
  formatDateLabel,
  category,
}: CategoryMonthlyBreakdownProps) {
  const navigate = useNavigate()

  if (!data || data.length === 0) {
    return null
  }

  // Trends & Anomalies logic - focus on expenses since this is category analysis
  let trendsContent = null
  if (data.length > 1) {
    let maxExpensesChange = 0
    let maxExpensesIdx = 1

    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1]
      const curr = data[i]
      const expensesChange = Math.abs((curr.expenses ?? 0) - (prev.expenses ?? 0))
      if (expensesChange > maxExpensesChange) {
        maxExpensesChange = expensesChange
        maxExpensesIdx = i
      }
    }

    const prevMonth = data[maxExpensesIdx - 1]
    const currMonth = data[maxExpensesIdx]

    trendsContent = (
      <TrendsContent
        prevMonth={prevMonth}
        currMonth={currMonth}
        formatDateLabel={formatDateLabel}
        formatCurrency={formatCurrency}
      />
    )
  }

  return (
    <div>
      <div>
        <h3 className="text-3xl font-semibold py-4">
          {category ? `${category} - ` : ''}Monthly Spending
        </h3>
        {/* Trends & Anomalies section */}
        {trendsContent || (
          <div className="text-sm text-muted-foreground mb-2">
            No significant changes in spending
          </div>
        )}
      </div>
      <div>
        {/* Table for md+ screens */}
        <div className="overflow-x-auto hidden md:block bg-white px-4 rounded-2xl py-4 border-2 border-muted">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Period</th>
                <th className="text-right py-2">Transactions</th>
                <th className="text-right py-2">Amount Spent</th>
                <th className="text-right py-2">Average Transaction</th>
                {compareToPrevious && <th className="text-right py-2">Spending Trend</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
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
        {/* Card list for mobile screens */}
        <div className="block md:hidden space-y-4">
          {data.map((item) => (
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
    </div>
  )
}
