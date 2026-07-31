import { MetricCard } from '@ponti-studios/ui/data-display';
import { EmptyState } from '@ponti-studios/ui/feedback';
import { Skeleton } from '@ponti-studios/ui/feedback';
import { SurfacePanel } from '@ponti-studios/ui/layout';
import type { ReactNode } from 'react';

import { useTimeSeriesData } from '~/lib/hooks/use-time-series';
import { formatCurrency } from '~/lib/number.utils';

function StatsShell({ children }: { children: ReactNode }) {
  return <SurfacePanel>{children}</SurfacePanel>;
}

interface AnalyticsStatisticsSummaryProps {
  dateFrom?: Date | undefined;
  dateTo?: Date | undefined;
  selectedAccount?: string | undefined;
  selectedTag?: string | undefined;
  includeStats?: boolean | undefined;
}

export function AnalyticsStatisticsSummary({
  dateFrom,
  dateTo,
  selectedAccount,
  selectedTag,
  includeStats = true,
}: AnalyticsStatisticsSummaryProps) {
  const {
    data: timeSeriesData,
    isLoading,
    error,
  } = useTimeSeriesData({
    dateFrom,
    dateTo,
    account: selectedAccount !== 'all' ? selectedAccount : undefined,
    tag: selectedTag || undefined,
    includeStats,
    compareToPrevious: false,
    groupBy: 'month',
  });

  const stats = timeSeriesData?.stats;

  if (!includeStats) {
    return (
      <EmptyState
        layout="inline"
        variant="quiet"
        title="Statistics disabled"
        description="Enable stats in filters to see summary data."
      />
    );
  }

  if (isLoading) {
    return (
      <StatsShell>
        <div className="space-y-4">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={`stat-skeleton-${i}`} className="h-24 rounded-xl" />
            ))}
          </div>
        </div>
      </StatsShell>
    );
  }

  if (error) {
    return (
      <EmptyState
        layout="inline"
        variant="dashed"
        title="Unable to load statistics"
        description={error.message || 'Retry later.'}
      />
    );
  }

  if (!stats) {
    return (
      <EmptyState
        layout="inline"
        variant="quiet"
        title="No statistics available"
        description="Try enabling stats in filters."
      />
    );
  }

  return (
    <StatsShell>
      <div className="space-y-4">
        <div>
          <h2 className="heading-4 text-foreground">Financial summary</h2>
          <p className="body-3 text-muted-foreground">{stats.periodCovered}</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Total income" value={formatCurrency(stats.totalIncome ?? 0)} />
          <MetricCard label="Total expenses" value={formatCurrency(stats.totalExpenses ?? 0)} />
          <MetricCard
            label="Avg income"
            value={formatCurrency(stats.averageIncome ?? 0)}
            change={`Over ${stats.count} months`}
          />
          <MetricCard
            label="Avg expenses"
            value={formatCurrency(stats.averageExpenses ?? 0)}
            change={`Over ${stats.count} months`}
          />
        </div>
      </div>
    </StatsShell>
  );
}
