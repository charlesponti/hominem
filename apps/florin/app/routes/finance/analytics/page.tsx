'use client'

import { subMonths } from 'date-fns'
import { useState } from 'react'
import { AdditionalAnalytics } from '~/components/finance/analytics/AdditionalAnalytics'
import { AnalyticsChartDisplay } from '~/components/finance/analytics/AnalyticsChartDisplay' // Fixed duplicate import
import { AnalyticsFilters } from '~/components/finance/analytics/AnalyticsFilters'
import { AnalyticsMonthlyBreakdown } from '~/components/finance/analytics/AnalyticsMonthlyBreakdown'
import { AnalyticsStatisticsSummary } from '~/components/finance/analytics/AnalyticsStatisticsSummary'
import { useFinanceCategories } from '~/lib/hooks/use-finance-categories'
import { useFinanceCategoryBreakdown } from '~/lib/hooks/use-finance-category-breakdown'
import { useFinanceAccounts } from '~/lib/hooks/use-finance-data'
import { useFinanceTopMerchants } from '~/lib/hooks/use-finance-top-merchants'
import { useTimeSeriesData } from '~/lib/hooks/use-time-series'

export default function FinanceAnalyticsPage() {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subMonths(new Date(), 6))
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date())
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [includeStats, setIncludeStats] = useState<boolean>(true)
  const [compareToPrevious, setCompareToPrevious] = useState<boolean>(true)
  const [groupBy, setGroupBy] = useState<'month' | 'week' | 'day'>('month')
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')

  const { accounts, isLoading: accountsLoading } = useFinanceAccounts()

  const { categories, isLoading: categoriesLoading } = useFinanceCategories()

  const {
    data: timeSeriesData,
    chartData,
    isLoading,
    error,
    formatDateLabel,
  } = useTimeSeriesData({
    dateFrom,
    dateTo,
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    category: selectedCategory || undefined,
    includeStats,
    compareToPrevious,
    groupBy,
  })

  const {
    data: topMerchants,
    isLoading: isLoadingMerchants,
    error: errorMerchants,
  } = useFinanceTopMerchants({
    from: dateFrom?.toISOString().split('T')[0],
    to: dateTo?.toISOString().split('T')[0],
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    category: selectedCategory || undefined,
    limit: 5,
  })

  const {
    data: categoryBreakdown,
    isLoading: isLoadingCategories,
    error: errorCategories,
  } = useFinanceCategoryBreakdown({
    from: dateFrom?.toISOString().split('T')[0],
    to: dateTo?.toISOString().split('T')[0],
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    limit: 5,
  })

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
      </div>

      <div className="flex flex-col gap-4">
        <AnalyticsFilters
          dateFrom={dateFrom}
          setDateFrom={setDateFrom}
          dateTo={dateTo}
          setDateTo={setDateTo}
          selectedAccount={selectedAccount}
          setSelectedAccount={setSelectedAccount}
          accounts={accounts}
          accountsLoading={accountsLoading}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
          categoriesLoading={categoriesLoading}
          groupBy={groupBy}
          setGroupBy={setGroupBy}
          includeStats={includeStats}
          setIncludeStats={setIncludeStats}
          compareToPrevious={compareToPrevious}
          setCompareToPrevious={setCompareToPrevious}
        />

        <AnalyticsChartDisplay
          chartType={chartType}
          setChartType={setChartType}
          isLoading={isLoading}
          error={error}
          chartData={chartData}
        />

        <AnalyticsStatisticsSummary stats={timeSeriesData?.stats} />

        <AnalyticsMonthlyBreakdown
          data={timeSeriesData?.data}
          compareToPrevious={compareToPrevious}
          formatDateLabel={formatDateLabel}
        />

        <AdditionalAnalytics
          categoryBreakdown={categoryBreakdown}
          isLoadingCategories={isLoadingCategories}
          errorCategories={errorCategories}
          topMerchants={topMerchants}
          isLoadingMerchants={isLoadingMerchants}
          errorMerchants={errorMerchants}
          timeSeriesData={timeSeriesData}
          formatDateLabel={formatDateLabel}
        />
      </div>
    </div>
  )
}
