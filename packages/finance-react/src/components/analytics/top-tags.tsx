import { Badge } from '@hominem/ui/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@hominem/ui/components/ui/card';
import { Skeleton } from '@hominem/ui/components/ui/skeleton';

import { useTagBreakdown } from '../../hooks/use-analytics';

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

interface TopTagsProps {
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  selectedAccount?: string | undefined;
}

export function TopTags({ dateFrom, dateTo, selectedAccount }: TopTagsProps) {
  const {
    data: categoryBreakdown,
    isLoading,
    error,
  } = useTagBreakdown({
    from: dateFrom,
    to: dateTo,
    account: selectedAccount,
    limit: 5,
  });

  const skeletonItems = Array.from({ length: 5 }, (_, i) => i);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Top Tags</CardTitle>
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
          <div className="text-destructive">
            {error.message || 'Categories unavailable. Retry later.'}
          </div>
        ) : error ? (
          <div className="text-destructive">An unknown error occurred while fetching tags.</div>
        ) : Array.isArray(categoryBreakdown?.breakdown) &&
          categoryBreakdown.breakdown.length > 0 ? (
          <div className="space-y-3">
            {categoryBreakdown.breakdown.map(
              (cat: { tag: string; amount: number; transactionCount: number }) => {
                const tagLabel = cat.tag;
                return (
                  <div key={tagLabel} className="grid grid-cols-[auto_1fr_auto] gap-3 items-center">
                    <Badge variant="secondary" className="w-12 justify-center">
                      {cat.transactionCount}x
                    </Badge>
                    <span className="text-sm">{tagLabel}</span>
                    <span className="text-sm font-mono text-right">
                      {formatCurrency(cat.amount)}
                    </span>
                  </div>
                );
              },
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-4">
            No tag data available for the selected period
          </div>
        )}
      </CardContent>
    </Card>
  );
}
