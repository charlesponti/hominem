import { Badge } from '@hominem/ui/components/ui/badge'
import { subMonths } from 'date-fns'
import { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { TransactionFilters } from '~/components/finance/transaction-filters'
import { type FilterArgs, useFinanceAccountsWithMap } from '~/lib/hooks/use-finance-data'
import { useSelectedAccount } from '~/lib/hooks/use-selected-account'
import { useSort } from '~/lib/hooks/use-sort'
import { formatCurrency } from '~/lib/number.utils'
import { trpc } from '~/lib/trpc'

export default function CategoriesAnalyticsPage() {
  const navigate = useNavigate()
  const { selectedAccount } = useSelectedAccount()

  // Initialize filters with default date range
  const [filters, setFilters] = useState<FilterArgs>({
    dateFrom: subMonths(new Date(), 6),
    dateTo: new Date(),
  })

  const [searchValue, setSearchValue] = useState('')
  const { sortOptions, addSortOption, updateSortOption, removeSortOption } = useSort([])

  const {
    accountsMap,
    isLoading: accountsLoading,
    refetch: refetchAccounts,
  } = useFinanceAccountsWithMap()

  const {
    data: breakdown,
    isLoading,
    error,
    refetch: refetchBreakdown,
  } = trpc.finance.analyze.categoryBreakdown.useQuery({
    from: filters.dateFrom?.toISOString().split('T')[0],
    to: filters.dateTo?.toISOString().split('T')[0],
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    limit: '100',
  })

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: FilterArgs) => {
    setFilters(newFilters)
  }, [])

  // Handle search changes
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value)
  }, [])

  // Handle refresh
  const handleRefresh = useCallback(() => {
    refetchAccounts()
    refetchBreakdown()
  }, [refetchAccounts, refetchBreakdown])

  if (isLoading) return <div className="p-4 text-center">Loading…</div>
  if (error) return <div className="p-4 text-center text-red-600">Error loading data</div>

  return (
    <div className="container">
      <h1 className="text-2xl font-bold mb-4">Categories Breakdown</h1>

      {/* Transaction Filters */}
      <TransactionFilters
        accountsMap={accountsMap}
        accountsLoading={accountsLoading}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        searchValue={searchValue}
        onSearchChange={handleSearchChange}
        sortOptions={sortOptions}
        addSortOption={addSortOption}
        updateSortOption={updateSortOption}
        removeSortOption={removeSortOption}
        onRefresh={handleRefresh}
        loading={isLoading}
      />

      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left py-2">Category</th>
            <th className="text-right py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {breakdown?.map((item) => (
            <tr
              key={item.category}
              className="border-b border-gray-300 hover:bg-muted/50 cursor-pointer"
              onClick={() => navigate(`/analytics/category/${encodeURIComponent(item.category)}`)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ')
                  navigate(`/analytics/category/${encodeURIComponent(item.category)}`)
              }}
            >
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="w-12 justify-center">
                    {item.count}x
                  </Badge>
                  <Link
                    to={`/analytics/category/${encodeURIComponent(item.category)}`}
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {item.category}
                  </Link>
                </div>
              </td>
              <td className="text-right py-2 font-mono">{formatCurrency(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
