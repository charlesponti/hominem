import { Badge } from '~/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import { Skeleton } from '~/components/ui/skeleton'
import { useFinanceTopMerchants } from '~/lib/hooks/use-finance-top-merchants'
import { formatCurrency } from '~/lib/number.utils'

interface TopMerchantsProps {
  dateFrom?: Date
  dateTo?: Date
  selectedAccount?: string
  selectedCategory?: string
}

export function TopMerchants({
  dateFrom,
  dateTo,
  selectedAccount,
  selectedCategory,
}: TopMerchantsProps) {
  const {
    data: topMerchants,
    isLoading,
    error,
  } = useFinanceTopMerchants({
    from: dateFrom?.toISOString().split('T')[0],
    to: dateTo?.toISOString().split('T')[0],
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    category: selectedCategory || undefined,
    limit: 5,
  })

  const skeletonItems = Array.from({ length: 5 }, (_, i) => i)

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Top Merchants</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {skeletonItems.map((item) => (
              <div key={`merchant-skeleton-${item}`} className="flex justify-between items-center">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-4">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-8" />
                </div>
              </div>
            ))}
          </div>
        ) : error instanceof Error ? (
          <div className="text-red-500">
            {error.message || 'Your merchants are not available. Please try again later.'}
          </div>
        ) : error ? (
          <div className="text-red-500">An unknown error occurred while fetching merchants.</div>
        ) : topMerchants && topMerchants.length > 0 ? (
          <div className="space-y-3">
            {topMerchants.map((m) => (
              <div key={m.merchant} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
                <Badge variant="secondary" className="w-12 text-center">
                  {m.frequency}x
                </Badge>
                <span className="text-sm">{m.merchant}</span>
                <span className="text-sm font-mono text-right">{formatCurrency(m.totalSpent)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            No merchant data available for the selected period
          </div>
        )}
      </CardContent>
    </Card>
  )
}
