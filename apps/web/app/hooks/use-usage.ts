import { useApiClient } from '@hominem/rpc/react';
import { queryKeys } from '@hominem/rpc/react';
import type { MonthlyUsageReport } from '@hominem/rpc/types';
import { useQuery } from '@tanstack/react-query';

export function useUsageReport() {
  const client = useApiClient();

  return useQuery<MonthlyUsageReport>({
    queryKey: queryKeys.usage.report,
    queryFn: async () => {
      const response = await client.api.usage.$get();
      if (!response.ok) throw new Error('Usage unavailable.');
      return response.json();
    },
  });
}
