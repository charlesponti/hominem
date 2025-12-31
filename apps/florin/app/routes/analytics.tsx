import { subMonths } from 'date-fns'
import { useState } from 'react'
import { AnalyticsChartDisplay } from '~/components/analytics/analytics-chart-display'
import { AnalyticsFilters } from '~/components/analytics/analytics-filters'
import { AnalyticsStatisticsSummary } from '~/components/analytics/analytics-statistics-summary'
import { MonthlyBreakdown } from '~/components/analytics/monthly-breakdown'
import { TopCategories } from '~/components/analytics/top-categories'
import { TopMerchants } from '~/components/analytics/top-merchants'
import { BudgetHistoryChart } from '~/components/budget-categories'
import { BudgetOverview } from '~/components/budget-overview'
import { getLastMonthFromRange } from '@hominem/utils/dates'

export default function FinanceAnalyticsPage() {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subMonths(new Date(), 6))
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date())
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [includeStats, setIncludeStats] = useState<boolean>(true)
  const [compareToPrevious, setCompareToPrevious] = useState<boolean>(true)
  const [groupBy, setGroupBy] = useState<'month' | 'week' | 'day'>('month')
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')

  // Get the last month from the date range for budget overview
  const lastMonthYear = getLastMonthFromRange(dateFrom, dateTo)

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
      </div>

      <div className="flex flex-col gap-4">
        <AnalyticsFilters
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          includeStats={includeStats}
          setIncludeStats={setIncludeStats}
          compareToPrevious={compareToPrevious}
          setCompareToPrevious={setCompareToPrevious}
        />

        {/* Financial Summary and Budget Overview side by side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnalyticsStatisticsSummary
            dateFrom={dateFrom}
            dateTo={dateTo}
            selectedAccount={selectedAccount}
            selectedCategory={selectedCategory}
            includeStats={includeStats}
          />
          <BudgetOverview selectedMonthYear={lastMonthYear} />
        </div>

        <AnalyticsChartDisplay
          chartType={chartType}
          setChartType={setChartType}
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedAccount={selectedAccount}
          selectedCategory={selectedCategory}
          groupBy={groupBy}
          compareToPrevious={compareToPrevious}
        />

        <MonthlyBreakdown
          title="Monthly Breakdown"
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedAccount={selectedAccount}
          selectedCategory={selectedCategory}
          compareToPrevious={compareToPrevious}
          groupBy={groupBy}
        />

        <TopCategories
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedAccount={selectedAccount}
          selectedCategory={selectedCategory}
        />

        <TopMerchants
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedAccount={selectedAccount}
          selectedCategory={selectedCategory}
        />

        <BudgetHistoryChart />
      </div>
    </div>
  )
}
