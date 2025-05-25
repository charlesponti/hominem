'use client'

import { subMonths } from 'date-fns'
import { useState } from 'react'
import { useParams } from 'react-router'
import { AnalyticsChartDisplay } from '~/components/finance/analytics/AnalyticsChartDisplay'
import { CategoryMonthlyBreakdown } from '~/components/finance/analytics/CategoryMonthlyBreakdown'
import { useFinanceAccounts } from '~/lib/hooks/use-finance-data'
import { useTimeSeriesData } from '~/lib/hooks/use-time-series'

export default function CategoryAnalyticsPage() {
  const { category } = useParams<{ category: string }>()
  const { accounts, isLoading: accountsLoading } = useFinanceAccounts()
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<Date>(subMonths(new Date(), 6))
  const [dateTo] = useState<Date>(new Date())
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')

  const {
    data: timeSeries,
    formatDateLabel,
    isLoading,
    error,
    chartData,
  } = useTimeSeriesData({
    dateFrom,
    dateTo,
    category,
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    groupBy: 'month',
    compareToPrevious: true,
    includeStats: false,
  })

  if (isLoading) return <div className="p-4 text-center">Loading…</div>
  if (error) return <div className="p-4 text-center text-red-600">Error loading data</div>

  return (
    <div className="container">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h1 className="text-2xl font-bold">Category Analysis: {category}</h1>

        <div className="mt-4 md:mt-0">
          <select
            className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(e.target.value)}
            aria-label="Select account"
          >
            <option value="all">All Accounts</option>
            {accounts?.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-6">
        <AnalyticsChartDisplay
          chartType={chartType}
          setChartType={setChartType}
          isLoading={isLoading}
          error={error}
          chartData={chartData}
          timeSeriesData={timeSeries?.data}
        />

        <CategoryMonthlyBreakdown
          data={timeSeries?.data}
          compareToPrevious={true}
          formatDateLabel={formatDateLabel}
          category={category}
        />
      </div>
    </div>
  )
}
