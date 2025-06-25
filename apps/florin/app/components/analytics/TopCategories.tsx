import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { formatCurrency } from '~/lib/finance.utils'
import { trpc } from '~/lib/trpc'

interface TopCategoriesProps {
  dateFrom?: Date
  dateTo?: Date
  selectedAccount?: string
}

export function TopCategories({ dateFrom, dateTo, selectedAccount }: TopCategoriesProps) {
  const {
    data: categoryBreakdown,
    isLoading,
    error,
  } = trpc.finance.analyze.categoryBreakdown.useQuery({
    from: dateFrom?.toISOString().split('T')[0],
    to: dateTo?.toISOString().split('T')[0],
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    limit: '5',
  })

  const skeletonItems = Array.from({ length: 5 }, (_, i) => i)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Top Categories</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {skeletonItems.map((item) => (
              <div key={`category-skeleton-${item}`} className="flex justify-between items-center">
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : error instanceof Error ? (
          <div className="text-red-500">
            {error.message || 'Your categories are not available. Please try again later.'}
          </div>
        ) : error ? (
          <div className="text-red-500">An unknown error occurred while fetching categories.</div>
        ) : categoryBreakdown && categoryBreakdown.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left">Category</th>
                <th className="text-right">Total</th>
                <th className="text-right">Count</th>
              </tr>
            </thead>
            <tbody>
              {categoryBreakdown.map((cat) => (
                <tr key={cat.category}>
                  <td>{cat.category}</td>
                  <td className="text-right font-mono">{formatCurrency(cat.total)}</td>
                  <td className="text-right">{cat.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            No category data available for the selected period
          </div>
        )}
      </CardContent>
    </Card>
  )
}
