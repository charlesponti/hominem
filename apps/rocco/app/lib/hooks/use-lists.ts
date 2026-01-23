import type { HonoClient } from '@hominem/hono-client';
import type { HonoMutationOptions, HonoQueryOptions } from '@hominem/hono-client/react';
import type {
  ListGetAllOutput,
  ListGetByIdOutput,
  ListCreateInput,
  ListCreateOutput,
  ListUpdateInput,
  ListUpdateOutput,
  ListDeleteInput,
  ListDeleteOutput,
  ListDeleteItemInput,
  ListDeleteItemOutput,
  ListGetContainingPlaceOutput,
  ListRemoveCollaboratorInput,
  ListRemoveCollaboratorOutput,
} from '@hominem/hono-rpc/types';
import type { ApiResult } from '@hominem/services';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Get all user's lists with places
 */
export const useLists = (options?: HonoQueryOptions<ApiResult<ListGetAllOutput>>) =>
  useHonoQuery<ApiResult<ListGetAllOutput>>(
    ['lists'],
    async (client: HonoClient) => {
      const res = await client.api.lists.list.$post({ json: {} });
      return res.json() as Promise<ApiResult<ListGetAllOutput>>;
    },
    options,
  );

/**
 * Get single list by ID
 */
export const useListById = (
  id: string | undefined,
  options?: HonoQueryOptions<ApiResult<ListGetByIdOutput>>,
) =>
  useHonoQuery<ApiResult<ListGetByIdOutput | null>>(
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
export const useCreateList = (
  options?: HonoMutationOptions<ApiResult<ListCreateOutput>, ListCreateInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<ListCreateOutput>, ListCreateInput>(
    async (client: HonoClient, variables: ListCreateInput) => {
      const res = await client.api.lists.create.$post({ json: variables });
      return res.json() as Promise<ApiResult<ListCreateOutput>>;
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
export const useUpdateList = (
  options?: HonoMutationOptions<ApiResult<ListUpdateOutput>, ListUpdateInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<ListUpdateOutput>, ListUpdateInput>(
    async (client: HonoClient, variables: ListUpdateInput) => {
      const res = await client.api.lists.update.$post({ json: variables });
      return res.json() as Promise<ApiResult<ListUpdateOutput>>;
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
  options?: HonoMutationOptions<ApiResult<ListDeleteOutput>, ListDeleteInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<ListDeleteOutput>, ListDeleteInput>(
    async (client: HonoClient, variables: ListDeleteInput) => {
      const res = await client.api.lists.delete.$post({ json: variables });
      return res.json() as Promise<ApiResult<ListDeleteOutput>>;
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
  options?: HonoMutationOptions<ApiResult<ListDeleteItemOutput>, ListDeleteItemInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<ListDeleteItemOutput>, ListDeleteItemInput>(
    async (client: HonoClient, variables: ListDeleteItemInput) => {
      const res = await client.api.lists['delete-item'].$post({ json: variables });
      return res.json() as Promise<ApiResult<ListDeleteItemOutput>>;
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
  useHonoQuery<ApiResult<ListGetContainingPlaceOutput>>(
    ['lists', 'containing-place', placeId, googleMapsId],
    async (client: HonoClient) => {
      const res = await client.api.lists['containing-place'].$post({
        json: { placeId, googleMapsId },
      });
      return res.json() as Promise<ApiResult<ListGetContainingPlaceOutput>>;
    },
    {
      enabled: !!placeId || !!googleMapsId,
    },
  );

/**
 * Remove collaborator from list
 */
export const useRemoveCollaborator = (
  options?: HonoMutationOptions<
    ApiResult<ListRemoveCollaboratorOutput>,
    ListRemoveCollaboratorInput
  >,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<ListRemoveCollaboratorOutput>, ListRemoveCollaboratorInput>(
    async (client: HonoClient, variables: ListRemoveCollaboratorInput) => {
      const res = await client.api.lists['remove-collaborator'].$post({ json: variables });
      return res.json() as Promise<ApiResult<ListRemoveCollaboratorOutput>>;
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
