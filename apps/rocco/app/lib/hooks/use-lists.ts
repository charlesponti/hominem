import type { HonoClient } from '@hominem/hono-client';
import type { HonoMutationOptions, HonoQueryOptions } from '@hominem/hono-client/react';
import type {
  ListCreateInput,
  ListUpdateInput,
  ListDeleteInput,
  ListDeleteItemInput,
  ListGetContainingPlaceOutput,
  ListRemoveCollaboratorInput,
} from '@hominem/hono-rpc/types';
import type { List } from '@hominem/lists-services';
import type { ApiResult } from '@hominem/services';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Get all user's lists with places
 */
export const useLists = (options?: HonoQueryOptions<ApiResult<List[]>>) =>
  useHonoQuery<ApiResult<List[]>>(
    ['lists'],
    async (client: HonoClient) => {
      const res = await client.api.lists.list.$post({ json: {} });
      return res.json() as Promise<ApiResult<List[]>>;
    },
    options,
  );

/**
 * Get single list by ID
 */
export const useListById = (
  id: string | undefined,
  options?: HonoQueryOptions<ApiResult<List | null>>,
) =>
  useHonoQuery<ApiResult<List | null>>(
    ['lists', 'get', id],
    async (client: HonoClient) => {
      if (!id) return { success: true, data: null };
      const res = await client.api.lists.get.$post({ json: { id } });
      return res.json();
    },
    {
      enabled: !!id,
      ...options,
    },
  );

/**
 * Create new list
 */
export const useCreateList = (options?: HonoMutationOptions<ApiResult<List>, ListCreateInput>) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<List>, ListCreateInput>(
    async (client: HonoClient, variables: ListCreateInput) => {
      const res = await client.api.lists.create.$post({ json: variables });
      return res.json() as Promise<ApiResult<List>>;
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['lists']);
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Update list
 */
export const useUpdateList = (options?: HonoMutationOptions<ApiResult<List>, ListUpdateInput>) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<List>, ListUpdateInput>(
    async (client: HonoClient, variables: ListUpdateInput) => {
      const res = await client.api.lists.update.$post({ json: variables });
      return res.json() as Promise<ApiResult<List>>;
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['lists']);
          utils.invalidate(['lists', 'get', result.data.id]);
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Delete list
 */
export const useDeleteList = (
  options?: HonoMutationOptions<ApiResult<{ success: boolean }>, ListDeleteInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<{ success: boolean }>, ListDeleteInput>(
    async (client: HonoClient, variables: ListDeleteInput) => {
      const res = await client.api.lists.delete.$post({ json: variables });
      return res.json() as Promise<ApiResult<{ success: boolean }>>;
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['lists']);
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Delete item from list
 */
export const useDeleteListItem = (
  options?: HonoMutationOptions<ApiResult<{ success: boolean }>, ListDeleteItemInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<{ success: boolean }>, ListDeleteItemInput>(
    async (client: HonoClient, variables: ListDeleteItemInput) => {
      const res = await client.api.lists['delete-item'].$post({ json: variables });
      return res.json() as Promise<ApiResult<{ success: boolean }>>;
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['lists']);
          utils.invalidate(['lists', 'get', variables.listId]);
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Get lists containing a specific place
 */
export const useListsContainingPlace = (
  placeId: string | undefined,
  googleMapsId: string | undefined,
) =>
  useHonoQuery<ApiResult<{ id: string; name: string; isOwner: boolean }[]>>(
    ['lists', 'containing-place', placeId, googleMapsId],
    async (client: HonoClient) => {
      const res = await client.api.lists['containing-place'].$post({
        json: { placeId, googleMapsId },
      });
      return res.json() as Promise<ApiResult<{ id: string; name: string; isOwner: boolean }[]>>;
    },
    {
      enabled: !!placeId || !!googleMapsId,
    },
  );

/**
 * Remove collaborator from list
 */
export const useRemoveCollaborator = (
  options?: HonoMutationOptions<ApiResult<{ success: boolean }>, ListRemoveCollaboratorInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<{ success: boolean }>, ListRemoveCollaboratorInput>(
    async (client: HonoClient, variables: ListRemoveCollaboratorInput) => {
      const res = await client.api.lists['remove-collaborator'].$post({ json: variables });
      return res.json() as Promise<ApiResult<{ success: boolean }>>;
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['lists']);
          utils.invalidate(['lists', 'get', variables.listId]);
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};
