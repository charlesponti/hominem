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
} from '@hominem/hono-rpc/types/lists.types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

import { queryKeys } from '~/lib/query-keys';

/**
 * Get all user's lists with places
 */
export const useLists = (options?: HonoQueryOptions<ListGetAllOutput>) =>
  useHonoQuery<ListGetAllOutput>(
    queryKeys.lists.all(),
    async (client: HonoClient) => {
      const res = await client.api.lists.list.$post({ json: {} });
      return res.json();
    },
    options,
  );

/**
 * Get single list by ID
 */
export const useListById = (
  id: string | undefined,
  options?: HonoQueryOptions<ListGetByIdOutput>,
) =>
  useHonoQuery<ListGetByIdOutput>(
    queryKeys.lists.get(id || ''),
    async (client: HonoClient) => {
      if (!id) throw new Error('ID is required');
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
export const useCreateList = (options?: HonoMutationOptions<ListCreateOutput, ListCreateInput>) => {
  const utils = useHonoUtils();
  return useHonoMutation<ListCreateOutput, ListCreateInput>(
    async (client: HonoClient, variables: ListCreateInput) => {
      const res = await client.api.lists.create.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.lists.all());
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Update list
 */
export const useUpdateList = (options?: HonoMutationOptions<ListUpdateOutput, ListUpdateInput>) => {
  const utils = useHonoUtils();
  return useHonoMutation<ListUpdateOutput, ListUpdateInput>(
    async (client: HonoClient, variables: ListUpdateInput) => {
      const res = await client.api.lists.update.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.lists.get(result.id));
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Delete list
 */
export const useDeleteList = (options?: HonoMutationOptions<ListDeleteOutput, ListDeleteInput>) => {
  const utils = useHonoUtils();
  return useHonoMutation<ListDeleteOutput, ListDeleteInput>(
    async (client: HonoClient, variables: ListDeleteInput) => {
      const res = await client.api.lists.delete.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.lists.all());
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
  options?: HonoMutationOptions<ListDeleteItemOutput, ListDeleteItemInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ListDeleteItemOutput, ListDeleteItemInput>(
    async (client: HonoClient, variables: ListDeleteItemInput) => {
      const res = await client.api.lists['delete-item'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.lists.get(variables.listId));
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
  useHonoQuery<ListGetContainingPlaceOutput>(
    queryKeys.lists.containing(placeId, googleMapsId),
    async (client: HonoClient) => {
      const res = await client.api.lists['containing-place'].$post({
        json: { placeId, googleMapsId },
      });
      return res.json();
    },
    {
      enabled: !!placeId || !!googleMapsId,
    },
  );

/**
 * Remove collaborator from list
 */
export const useRemoveCollaborator = (
  options?: HonoMutationOptions<ListRemoveCollaboratorOutput, ListRemoveCollaboratorInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ListRemoveCollaboratorOutput, ListRemoveCollaboratorInput>(
    async (client: HonoClient, variables: ListRemoveCollaboratorInput) => {
      const res = await client.api.lists['remove-collaborator'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.lists.get(variables.listId));
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};
