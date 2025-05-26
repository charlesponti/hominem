import type { TimeSeriesDataPoint } from '@hominem/utils/types'
import { Link, useNavigate } from 'react-router'
import { formatCurrency } from '~/lib/finance.utils'
import { cn } from '~/lib/utils'

interface AnalyticsMonthlyBreakdownProps {
  data: TimeSeriesDataPoint[] | undefined
  compareToPrevious: boolean
  formatDateLabel: (dateStr: string) => string
}

const DeltaIcon = ({ delta }: { delta: number }) => {
  if (delta > 0)
    return (
      <span className="text-green-500 mr-1" aria-label="Increase">
        ▲
      </span>
    )
  if (delta < 0)
    return (
      <span className="text-red-500 mr-1" aria-label="Decrease">
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
  positiveClass,
  negativeClass,
}: {
  label: string
  prevDate: string
  currDate: string
  delta: number
  formatDateLabel: (dateStr: string) => string
  formatCurrency: (n: number) => string
  positiveClass: string
  negativeClass: string
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
            delta > 0 ? positiveClass : delta < 0 ? negativeClass : 'text-muted-foreground'
          }
        >
          {formatCurrency(delta)}
        </span>
      </div>
    </div>
  )
}

function TrendsContent({
  prevIncome,
  currIncome,
  prevExpenses,
  currExpenses,
  formatDateLabel,
  formatCurrency,
}: {
  prevIncome: TimeSeriesDataPoint
  currIncome: TimeSeriesDataPoint
  prevExpenses: TimeSeriesDataPoint
  currExpenses: TimeSeriesDataPoint
  formatDateLabel: (dateStr: string) => string
  formatCurrency: (n: number) => string
}) {
  const incomeDelta = (currIncome.income ?? 0) - (prevIncome.income ?? 0)
  const expensesDelta = (currExpenses.expenses ?? 0) - (prevExpenses.expenses ?? 0)
  return (
    <div className="rounded-lg border bg-muted/40 p-4 mb-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TrendsDelta
          label="Largest income change"
          prevDate={prevIncome.date}
          currDate={currIncome.date}
          delta={incomeDelta}
          formatDateLabel={formatDateLabel}
          formatCurrency={formatCurrency}
          positiveClass="text-green-600"
          negativeClass="text-red-600"
        />
        <TrendsDelta
          label="Largest expenses change"
          prevDate={prevExpenses.date}
          currDate={currExpenses.date}
          delta={expensesDelta}
          formatDateLabel={formatDateLabel}
          formatCurrency={formatCurrency}
          positiveClass="text-red-600"
          negativeClass="text-green-600"
        />
      </div>
    </div>
  )
}

interface MonthItemProps {
  item: TimeSeriesDataPoint
  compareToPrevious: boolean
  formatDateLabel: (dateStr: string) => string
}

function MonthTableRow({ item, compareToPrevious, formatDateLabel }: MonthItemProps) {
  const navigate = useNavigate()
  return (
    <tr
      className="border-b hover:bg-muted/50 cursor-pointer"
      onClick={() => navigate(`/analytics/monthly/${item.date}`)}
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/analytics/monthly/${item.date}`)
      }}
    >
      <td className="py-2">
        <Link
          to={`/analytics/monthly/${item.date}`}
          className="hover:underline"
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          {formatDateLabel(item.date)}
        </Link>
      </td>
      <td className="text-right py-2">{item.count}</td>
      <td className="text-right py-2 font-mono">{item.formattedAmount}</td>
      <td className="text-right py-2 font-mono">{formatCurrency(item.average)}</td>
      {compareToPrevious && (
        <td
          className={cn('text-right py-2 font-mono', {
            'text-red-500': item.trend?.direction === 'down',
            'text-green-500': item.trend?.direction === 'up',
          })}
        >
          {item.trend
            ? `${item.trend.direction === 'up' ? '+' : '-'}${item.trend.percentChange}%`
            : '-'}
        </td>
      )}
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

function MonthMobileItem({ item, compareToPrevious, formatDateLabel }: MonthItemProps) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className="w-full text-left rounded-lg border p-4 shadow-sm bg-background cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
      onClick={() => navigate(`/analytics/monthly/${item.date}`)}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/analytics/monthly/${item.date}`)
      }}
      aria-label={`View details for ${formatDateLabel(item.date)}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm text-muted-foreground">
          {formatDateLabel(item.date)}
        </span>
        <Link
          to={`/analytics/monthly/${item.date}`}
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
          Total: <span className="font-mono">{item.formattedAmount}</span>
        </div>
        <div className="flex justify-between w-full">
          Average: <span className="font-mono">{formatCurrency(item.average)}</span>
        </div>
        {compareToPrevious && (
          <div className="flex justify-between w-full">
            Income Trend:{' '}
            <span
              className={cn('font-mono', {
                'text-red-500': item.trend?.direction === 'down',
                'text-green-500': item.trend?.direction === 'up',
              })}
            >
              {item.trend
                ? `${item.trend.direction === 'up' ? '+' : '-'}${item.trend.percentChange}%`
                : '-'}
            </span>
          </div>
        )}
        {compareToPrevious && (
          <div className="flex justify-between w-full">
            Expenses Trend:{' '}
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

export function AnalyticsMonthlyBreakdown({
  data,
  compareToPrevious,
  formatDateLabel,
}: AnalyticsMonthlyBreakdownProps) {
  const navigate = useNavigate()

  if (!data || data.length === 0) {
    return null
  }

  // Trends & Anomalies logic
  let trendsContent = null
  if (data.length > 1) {
    let maxIncomeChange = 0
    let maxIncomeIdx = 1
    let maxExpensesChange = 0
    let maxExpensesIdx = 1
    for (let i = 1; i < data.length; i++) {
      const prev = data[i - 1]
      const curr = data[i]
      const incomeChange = Math.abs((curr.income ?? 0) - (prev.income ?? 0))
      if (incomeChange > maxIncomeChange) {
        maxIncomeChange = incomeChange
        maxIncomeIdx = i
      }
      const expensesChange = Math.abs((curr.expenses ?? 0) - (prev.expenses ?? 0))
      if (expensesChange > maxExpensesChange) {
        maxExpensesChange = expensesChange
        maxExpensesIdx = i
      }
    }
    const prevIncome = data[maxIncomeIdx - 1]
    const currIncome = data[maxIncomeIdx]
    const prevExpenses = data[maxExpensesIdx - 1]
    const currExpenses = data[maxExpensesIdx]
    trendsContent = (
      <TrendsContent
        prevIncome={prevIncome}
        currIncome={currIncome}
        prevExpenses={prevExpenses}
        currExpenses={currExpenses}
        formatDateLabel={formatDateLabel}
        formatCurrency={formatCurrency}
      />
    )
  }

  return (
    <div>
      <div>
        <h3 className="text-3xl font-semibold py-4">Monthly Breakdown</h3>
        {/* Trends & Anomalies section */}
        {trendsContent || (
          <div className="text-sm text-muted-foreground mb-2">No significant changes</div>
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
                <th className="text-right py-2">Total Amount</th>
                <th className="text-right py-2">Average</th>
                {compareToPrevious && <th className="text-right py-2">Income Trend</th>}
                {compareToPrevious && <th className="text-right py-2">Expenses Trend</th>}
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <MonthTableRow
                  key={item.date}
                  item={item}
                  compareToPrevious={compareToPrevious}
                  formatDateLabel={formatDateLabel}
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
            />
          ))}
        </div>
      </div>
    </div>
  )
}
