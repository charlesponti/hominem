'use client'

import type { FinanceAccount } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'
import { subMonths } from 'date-fns'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { AdditionalAnalytics } from '~/components/finance/analytics/AdditionalAnalytics'
import { AnalyticsChartDisplay } from '~/components/finance/analytics/AnalyticsChartDisplay' // Fixed duplicate import
import { AnalyticsFilters } from '~/components/finance/analytics/AnalyticsFilters'
import { AnalyticsMonthlyBreakdown } from '~/components/finance/analytics/AnalyticsMonthlyBreakdown'
import { AnalyticsStatisticsSummary } from '~/components/finance/analytics/AnalyticsStatisticsSummary'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { useApiClient } from '~/lib/hooks/use-api-client'
import { useFinanceCategories } from '~/lib/hooks/use-finance-categories'
import { useFinanceCategoryBreakdown } from '~/lib/hooks/use-finance-category-breakdown'
import { useFinanceTopMerchants } from '~/lib/hooks/use-finance-top-merchants'
import { useTimeSeriesData } from '~/lib/hooks/use-time-series'

export default function FinanceAnalyticsPage() {
  const navigate = useNavigate()

  // State for filters and data
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subMonths(new Date(), 6))
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date())
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [includeStats, setIncludeStats] = useState<boolean>(true)
  const [compareToPrevious, setCompareToPrevious] = useState<boolean>(true)
  const [groupBy, setGroupBy] = useState<'month' | 'week' | 'day'>('month')
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')
  const apiClient = useApiClient() // Added apiClient instance

  // Fetch accounts directly
  const { data: accounts = [], isLoading: accountsLoading } = useQuery<FinanceAccount[], Error>({
    queryKey: ['finance', 'accounts'],
    queryFn: () => apiClient.get<never, FinanceAccount[]>('/api/finance/accounts'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  // Use our custom hook for categories
  const { categories, isLoading: categoriesLoading } = useFinanceCategories()

  // Use our custom hook for time series data
  const {
    data: timeSeriesData,
    chartData,
    isLoading,
    error,
    formatDateLabel,
    formatCurrency,
  } = useTimeSeriesData({
    dateFrom,
    dateTo,
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    category: selectedCategory || undefined,
    includeStats,
    compareToPrevious,
    groupBy,
  })

  // Top merchants and categories analytics
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
        <h1 className="text-2xl font-bold">Spending Analytics</h1>
      </div>

      {/* Use the new AnalyticsFilters component */}
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

      {/* Chart Display */}
      <Tabs defaultValue="chart" className="space-y-4">
        <div className="flex justify-between items-center">
          <TabsList>
            <TabsTrigger value="chart">Chart</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>
          {/* Chart type buttons moved to AnalyticsChartDisplay */}
        </div>

        {/* Render the new AnalyticsChartDisplay component */}
        <AnalyticsChartDisplay
          chartType={chartType}
          setChartType={setChartType}
          isLoading={isLoading}
          error={error}
          chartData={chartData}
          formatCurrency={formatCurrency}
        />

        <TabsContent value="statistics" className="space-y-4">
          {/* Render the new AnalyticsStatisticsSummary component */}
          <AnalyticsStatisticsSummary
            stats={timeSeriesData?.stats}
            formatCurrency={formatCurrency}
          />

          {/* Render the new AnalyticsMonthlyBreakdown component */}
          <AnalyticsMonthlyBreakdown
            data={timeSeriesData?.data}
            compareToPrevious={compareToPrevious}
            formatDateLabel={formatDateLabel}
            formatCurrency={formatCurrency}
          />

          {/* Render the new AdditionalAnalytics component */}
          <AdditionalAnalytics
            categoryBreakdown={categoryBreakdown}
            isLoadingCategories={isLoadingCategories}
            errorCategories={errorCategories}
            topMerchants={topMerchants}
            isLoadingMerchants={isLoadingMerchants}
            errorMerchants={errorMerchants}
            timeSeriesData={timeSeriesData}
            formatCurrency={formatCurrency}
            formatDateLabel={formatDateLabel}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
