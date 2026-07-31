import type { Merchant } from '@hominem/rpc/finance';
import { Skeleton } from '@ponti-studios/ui/feedback';
import { Badge } from '@ponti-studios/ui/primitives';
import { Card, CardContent, CardHeader, CardTitle } from '@ponti-studios/ui/primitives';

import { useFinanceTopMerchants } from '~/lib/hooks/use-finance-top-merchants';
import { formatCurrency } from '~/lib/number.utils';

interface TopMerchantsProps {
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  selectedAccount?: string | undefined;
  selectedTag?: string | undefined;
}

export function TopMerchants({
  dateFrom,
  dateTo,
  selectedAccount,
  selectedTag,
}: TopMerchantsProps) {
  const {
    data: topMerchants,
    isLoading,
    error,
  } = useFinanceTopMerchants({
    from: dateFrom?.toISOString().split('T')[0],
    to: dateTo?.toISOString().split('T')[0],
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    tag: selectedTag || undefined,
    limit: 5,
  });

  const skeletonItems = Array.from({ length: 5 }, (_, i) => i);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Merchants</CardTitle>
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
          <div className="text-destructive">
            {error.message || 'Merchants unavailable. Retry later.'}
          </div>
        ) : error ? (
          <div className="text-destructive">
            An unknown error occurred while fetching merchants.
          </div>
        ) : Array.isArray(topMerchants?.merchants) && topMerchants.merchants.length > 0 ? (
          <div className="space-y-3">
            {topMerchants.merchants.map((m: Merchant) => (
              <div key={m.name} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
                <Badge variant="secondary">{m.transactionCount}x</Badge>
                <span className="text-sm">{m.name}</span>
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
  );
}
