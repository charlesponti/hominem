import { useApiClient } from '@hominem/rpc/react';
import { queryKeys } from '@hominem/rpc/react';
import type { InboxOutput } from '@hominem/rpc/types/inbox.types';
import { useQuery } from '@tanstack/react-query';

export function useInbox(limit: number = 50) {
  const client = useApiClient();

  return useQuery({
    queryKey: queryKeys.inbox.page({ limit }),
    staleTime: 1000 * 30,
    queryFn: async () => {
      const res = await client.api.inbox.$get({ query: { limit: String(limit) } });
      return res.json() as Promise<InboxOutput>;
    },
  });
}
