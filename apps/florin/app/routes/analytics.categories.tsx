'use client'

import { subMonths } from 'date-fns'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { formatCurrency } from '~/lib/finance.utils'
import { useFinanceCategoryBreakdown } from '~/lib/hooks/use-finance-category-breakdown'
import { useFinanceAccounts } from '~/lib/hooks/use-finance-data'

export default function CategoriesAnalyticsPage() {
  const navigate = useNavigate()
  const [dateFrom] = useState<Date>(subMonths(new Date(), 6))
  const [dateTo] = useState<Date>(new Date())
  const { accounts, isLoading: accountsLoading } = useFinanceAccounts()
  const [selectedAccount, setSelectedAccount] = useState<string>('all')

  const {
    data: breakdown,
    isLoading,
    error,
  } = useFinanceCategoryBreakdown({
    from: dateFrom.toISOString().split('T')[0],
    to: dateTo.toISOString().split('T')[0],
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    limit: 100,
  })

  if (isLoading) return <div className="p-4 text-center">Loading…</div>
  if (error) return <div className="p-4 text-center text-red-600">Error loading data</div>

  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-4">Categories Breakdown</h1>
      <div className="mb-4 flex items-center gap-2">
        <label htmlFor="account-select" className="font-medium">
          Account:
        </label>
        <select
          id="account-select"
          value={selectedAccount}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="border rounded px-2 py-1"
          disabled={accountsLoading}
        >
          <option value="all">All</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>
              {acc.name}
            </option>
          ))}
        </select>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2">Category</th>
            <th className="text-right py-2">Total</th>
            <th className="text-right py-2">Count</th>
          </tr>
        </thead>
        <tbody>
          {breakdown?.map((item) => (
            <tr
              key={item.category}
              className="border-b hover:bg-muted/50 cursor-pointer"
              onClick={() => navigate(`/analytics/category/${encodeURIComponent(item.category)}`)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  navigate(`/analytics/category/${encodeURIComponent(item.category)}`)
              }}
            >
              <td className="py-2">
                <Link
                  to={`/analytics/category/${encodeURIComponent(item.category)}`}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {item.category}
                </Link>
              </td>
              <td className="text-right py-2 font-mono">{formatCurrency(item.total)}</td>
              <td className="text-right py-2">{item.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
