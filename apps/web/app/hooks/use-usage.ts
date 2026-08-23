import { queryKeys } from '@hominem/rpc/react';
import type { MonthlyUsageReport } from '@hominem/rpc/types';
import type { UsageTimeseriesReport } from '@hominem/rpc/types';
import { useQuery } from '@tanstack/react-query';

export function useUsageReport() {
  return useQuery<MonthlyUsageReport>({
    queryKey: queryKeys.usage.report,
    queryFn: async () => {
      const response = await fetch('/api/usage', { credentials: 'same-origin' });
      if (!response.ok) throw new Error('Usage unavailable.');
      return response.json();
    },
  });
}

export type UsageTimeseriesOptions = {
  from: string;
  to: string;
  granularity: 'day' | 'month';
};

export function useUsageTimeseries(options: UsageTimeseriesOptions) {
  return useQuery<UsageTimeseriesReport>({
    queryKey: queryKeys.usage.timeseries(options),
    queryFn: async () => {
      const params = new URLSearchParams(options);
      const response = await fetch(`/api/usage-timeseries?${params.toString()}`, {
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('Usage trends unavailable.');
      return response.json();
    },
  });
}
