import { useApiClient } from '@hominem/rpc/react';
import type {
  AcceptCollectionInviteOutput,
  ListPendingCollectionInvitesOutput,
} from '@hominem/rpc/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const collaborationInvitesKey = ['collaboration-invites'] as const;

export function useCollaborationInvites(options: { enabled?: boolean } = {}) {
  const client = useApiClient();

  const generic = useQuery({
    queryKey: [...collaborationInvitesKey, 'collections'],
    enabled: options.enabled ?? true,
    staleTime: 1000 * 15,
    queryFn: async () => {
      const response = await client.api.collections.invites.$get({ query: {} });
      return response.json() as Promise<ListPendingCollectionInvitesOutput>;
    },
  });

  return {
    generic,
    invites: generic.data?.invites ?? [],
    count: generic.data?.count ?? 0,
    isLoading: generic.isLoading,
    isError: generic.isError,
  };
}

export function useAcceptCollaborationInvite() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<AcceptCollectionInviteOutput, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      const response = await client.api.collections.invites[':collectionId'].accept.$post({
        param: { collectionId: id },
      });
      return response.json() as Promise<AcceptCollectionInviteOutput>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationInvitesKey });
    },
  });
}

export function useDeclineCollaborationInvite() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { id: string }>({
    mutationFn: async ({ id }) => {
      await client.api.collections.invites[':collectionId'].decline.$post({
        param: { collectionId: id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationInvitesKey });
    },
  });
}
