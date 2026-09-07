import { useApiClient } from '@hominem/rpc/react';
import type { CollectionItem, CollectionMember } from '@hominem/rpc/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const collectionsKey = ['collections'] as const;
const collectionDetailKey = (id: string) => [...collectionsKey, id] as const;

export function isInvitableRole(value: string): value is 'editor' | 'viewer' {
  return value === 'editor' || value === 'viewer';
}

export function useCollectionsList() {
  const client = useApiClient();

  return useQuery({
    queryKey: collectionsKey,
    staleTime: 1000 * 15,
    queryFn: async () => {
      const response = await client.api.collections.$get({ query: { limit: '50' } });
      return response.json();
    },
  });
}

export function useCreateCollection() {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      visibility: 'private' | 'shared';
    }) => {
      const response = await client.api.collections.$post({ json: input });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionsKey });
    },
  });
}

export function useCollectionDetail(collectionId: string) {
  const client = useApiClient();

  return useQuery({
    queryKey: collectionDetailKey(collectionId),
    staleTime: 1000 * 15,
    queryFn: async () => {
      const response = await client.api.collections[':collectionId'].$get({
        param: { collectionId },
      });
      return response.json();
    },
  });
}

export function useUpdateCollection(collectionId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      name?: string;
      description?: string | null;
      visibility?: 'private' | 'shared';
    }) => {
      const response = await client.api.collections[':collectionId'].$patch({
        param: { collectionId },
        json: input,
      });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionDetailKey(collectionId) });
      void queryClient.invalidateQueries({ queryKey: collectionsKey });
    },
  });
}

export function useDeleteCollection(collectionId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await client.api.collections[':collectionId'].$delete({
        param: { collectionId },
      });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionsKey });
    },
  });
}

export function useLeaveCollection(collectionId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await client.api.collections[':collectionId'].leave.$post({
        param: { collectionId },
      });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionsKey });
    },
  });
}

export function useRemoveCollectionItem(collectionId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      entityType,
      entityId,
    }: {
      entityType: CollectionItem['entityType'];
      entityId: string;
    }) => {
      const response = await client.api.collections[':collectionId'].items[':entityType'][
        ':entityId'
      ].$delete({
        param: { collectionId, entityType, entityId },
      });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionDetailKey(collectionId) });
    },
  });
}

export function useInviteMember(collectionId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, role }: { email: string; role: 'editor' | 'viewer' }) => {
      const response = await client.api.collections[':collectionId'].members.$post({
        param: { collectionId },
        json: { email, role },
      });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionDetailKey(collectionId) });
    },
  });
}

export function useUpdateMemberRole(collectionId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'editor' | 'viewer' }) => {
      const response = await client.api.collections[':collectionId'].members[':memberId'].$patch({
        param: { collectionId, memberId },
        json: { role },
      });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionDetailKey(collectionId) });
    },
  });
}

export function useRemoveMember(collectionId: string) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      const response = await client.api.collections[':collectionId'].members[':memberId'].$delete({
        param: { collectionId, memberId },
      });
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: collectionDetailKey(collectionId) });
    },
  });
}

export function memberDisplayName(member: CollectionMember): string {
  return member.invitedEmail ?? member.userEmail ?? member.userId ?? 'Unknown';
}
