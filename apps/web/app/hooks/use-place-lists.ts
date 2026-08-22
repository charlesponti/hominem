import { useApiClient } from '@hominem/rpc/react';
import type { AcceptPlaceListInviteOutput, ListPendingInvitesOutput } from '@hominem/rpc/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { placeListsQueryKeys } from '~/lib/query-keys';

export function usePendingPlaceListInvites(options: { enabled?: boolean } = {}) {
  const client = useApiClient();

  return useQuery({
    queryKey: placeListsQueryKeys.pendingInvites,
    enabled: options.enabled ?? true,
    staleTime: 1000 * 15,
    queryFn: async () => {
      const res = await client.api['place-lists'].invites.$get({ query: {} });
      return res.json() as Promise<ListPendingInvitesOutput>;
    },
  });
}

export function useAcceptPlaceListInvite() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<AcceptPlaceListInviteOutput, Error, { placeListId: string }>({
    mutationFn: async ({ placeListId }) => {
      const res = await client.api['place-lists'][':placeListId'].collaborators.accept.$post({
        param: { placeListId },
      });
      return res.json() as Promise<AcceptPlaceListInviteOutput>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: placeListsQueryKeys.pendingInvites });
    },
  });
}
