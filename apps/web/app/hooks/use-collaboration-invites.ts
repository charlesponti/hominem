import { useApiClient } from '@hominem/rpc/react';
import type {
  AcceptCollectionInviteOutput,
  ListPendingCollectionInvitesOutput,
} from '@hominem/rpc/types';
import type { AcceptPlaceListInviteOutput, ListPendingInvitesOutput } from '@hominem/rpc/types';
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

  const placeLists = useQuery({
    queryKey: [...collaborationInvitesKey, 'place-lists'],
    enabled: options.enabled ?? true,
    staleTime: 1000 * 15,
    queryFn: async () => {
      const response = await client.api['place-lists'].invites.$get({ query: {} });
      return response.json() as Promise<ListPendingInvitesOutput>;
    },
  });

  return {
    generic,
    placeLists,
    invites: [
      ...(generic.data?.invites ?? []).map((invite) => ({
        ...invite,
        kind: 'collection' as const,
      })),
      ...(placeLists.data?.invites ?? []).map((invite) => ({
        ...invite,
        kind: 'place_list' as const,
      })),
    ],
    count: (generic.data?.count ?? 0) + (placeLists.data?.count ?? 0),
    isLoading: generic.isLoading || placeLists.isLoading,
    isError: generic.isError || placeLists.isError,
  };
}

export function useAcceptCollaborationInvite() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<
    AcceptCollectionInviteOutput | AcceptPlaceListInviteOutput,
    Error,
    { kind: 'collection' | 'place_list'; id: string }
  >({
    mutationFn: async ({ kind, id }) => {
      if (kind === 'collection') {
        const response = await client.api.collections.invites[':collectionId'].accept.$post({
          param: { collectionId: id },
        });
        return response.json() as Promise<AcceptCollectionInviteOutput>;
      }

      const response = await client.api['place-lists'][':placeListId'].collaborators.accept.$post({
        param: { placeListId: id },
      });
      return response.json() as Promise<AcceptPlaceListInviteOutput>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationInvitesKey });
    },
  });
}

export function useDeclineCollaborationInvite() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<void, Error, { kind: 'collection' | 'place_list'; id: string }>({
    mutationFn: async ({ kind, id }) => {
      if (kind === 'collection') {
        await client.api.collections.invites[':collectionId'].decline.$post({
          param: { collectionId: id },
        });
        return;
      }

      await client.api['place-lists'][':placeListId'].collaborators.decline.$post({
        param: { placeListId: id },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaborationInvitesKey });
    },
  });
}
