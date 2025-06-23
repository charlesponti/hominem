'use client'

import { subMonths } from 'date-fns'
import { useState } from 'react'
import { useParams } from 'react-router'
import { AnalyticsChartDisplay } from '~/components/analytics/AnalyticsChartDisplay'
import { CategoryMonthlyBreakdown } from '~/components/analytics/CategoryMonthlyBreakdown'
import { useFinanceAccounts } from '~/lib/hooks/use-finance-data'

export default function CategoryAnalyticsPage() {
  const { category } = useParams<{ category: string }>()
  const { accounts, isLoading: accountsLoading } = useFinanceAccounts()
  const [selectedAccount, setSelectedAccount] = useState<string>('all')
  const [dateFrom, setDateFrom] = useState<Date>(subMonths(new Date(), 6))
  const [dateTo] = useState<Date>(new Date())
  const [chartType, setChartType] = useState<'area' | 'bar'>('area')

  if (accountsLoading) return <div className="p-4 text-center">Loading accounts…</div>

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
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedAccount={selectedAccount}
          selectedCategory={category}
          groupBy="month"
          compareToPrevious={true}
        />

        <CategoryMonthlyBreakdown
          dateFrom={dateFrom}
          dateTo={dateTo}
          selectedAccount={selectedAccount}
          selectedCategory={category}
          compareToPrevious={true}
          groupBy="month"
          category={category}
        />
      </div>
    </div>
  )
}
