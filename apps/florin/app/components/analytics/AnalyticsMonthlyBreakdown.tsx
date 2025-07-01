import { MonthlyBreakdown } from './MonthlyBreakdown'

interface AnalyticsMonthlyBreakdownProps {
  dateFrom?: Date
  dateTo?: Date
  selectedAccount?: string
  selectedCategory?: string
  compareToPrevious?: boolean
  groupBy?: 'month' | 'week' | 'day'
  category?: string
}

export function AnalyticsMonthlyBreakdown({
  dateFrom,
  dateTo,
  selectedAccount,
  selectedCategory,
  compareToPrevious = false,
  groupBy = 'month',
  category,
}: AnalyticsMonthlyBreakdownProps) {
  return (
    <MonthlyBreakdown
      dateFrom={dateFrom}
      dateTo={dateTo}
      selectedAccount={selectedAccount}
      selectedCategory={selectedCategory}
      compareToPrevious={compareToPrevious}
      groupBy={groupBy}
      category={category}
      title={
        groupBy === 'month' ? 'Monthly Breakdown' : groupBy === 'week' ? 'Weekly Breakdown' : 'Daily Breakdown'
      }
    />
  )
}
