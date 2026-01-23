import type { HonoMutationOptions } from '@hominem/hono-client';
import type {
  ListGetAllInput,
  ListGetAllOutput,
  ListGetByIdInput,
  ListGetByIdOutput,
  ListCreateInput,
  ListCreateOutput,
  ListUpdateInput,
  ListUpdateOutput,
  ListDeleteInput,
  ListDeleteOutput,
  ListDeleteItemInput,
  ListDeleteItemOutput,
  ListGetContainingPlaceInput,
  ListGetContainingPlaceOutput,
  ListRemoveCollaboratorInput,
  ListRemoveCollaboratorOutput,
} from '@hominem/hono-rpc/types';

import { useHonoClient, useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client';

/**
 * Get all user's lists with places
 */
export const useLists = () =>
  useHonoQuery<ListGetAllOutput>(['lists'], async (client) => {
    const res = await client.api.lists.list.$post({ json: {} });
    return res.json();
  });

/**
 * Get single list by ID
 */
export const useListById = (id: string | undefined) =>
  useHonoQuery<ListGetByIdOutput>(
    ['lists', 'get', id],
    async (client) => {
      if (!id) return null;
      const res = await client.api.lists.get.$post({ json: { id } });
      return res.json();
    },
    {
      enabled: !!id,
    },
  );

/**
 * Create new list
 */
export const useCreateList = (options?: HonoMutationOptions<ListCreateOutput, ListCreateInput>) => {
  const utils = useHonoUtils();
  return useHonoMutation<ListCreateOutput, ListCreateInput>(
    async (client, variables) => {
      const res = await client.api.lists.create.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['lists']);
        options?.onSuccess?.(data, variables, context, mutationContext);
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
    async (client, variables) => {
      const res = await client.api.lists.update.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['lists']);
        utils.invalidate(['lists', 'get', data.id]);
        options?.onSuccess?.(data, variables, context, mutationContext);
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
    async (client, variables) => {
      const res = await client.api.lists.delete.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['lists']);
        options?.onSuccess?.(data, variables, context, mutationContext);
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
    async (client, variables) => {
      const res = await client.api.lists['delete-item'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['lists']);
        utils.invalidate(['lists', 'get', variables.listId]);
        options?.onSuccess?.(data, variables, context, mutationContext);
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
    ['lists', 'containing-place', placeId, googleMapsId],
    async (client) => {
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
    async (client, variables) => {
      const res = await client.api.lists['remove-collaborator'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['lists']);
        utils.invalidate(['lists', 'get', variables.listId]);
        options?.onSuccess?.(data, variables, context, mutationContext);
      },
      ...options,
    },
  );
};
