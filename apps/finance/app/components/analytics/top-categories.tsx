import { Badge } from '@hominem/ui/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card'
import { Skeleton } from '@hominem/ui/components/ui/skeleton'
import { formatCurrency } from '~/lib/number.utils'
import { trpc } from '~/lib/trpc'

interface TopCategoriesProps {
  dateFrom?: Date
  dateTo?: Date
  selectedAccount?: string
  selectedCategory?: string
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
          <div className="space-y-3">
            {categoryBreakdown.map((cat) => (
              <div key={cat.category} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
                <Badge variant="secondary" className="w-12 justify-center">
                  {cat.count}x
                </Badge>
                <span className="text-sm">{cat.category}</span>
                <span className="text-sm font-mono text-right">{formatCurrency(cat.total)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            No category data available for the selected period
          </div>
        )}
      </CardContent>
    </Card>
  )
}
