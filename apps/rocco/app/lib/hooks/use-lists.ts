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

const OPTIMISTIC_OWNER_ID = '00000000-0000-0000-0000-000000000000';

const createOptimisticList = (variables: ListCreateInput): ListCreateOutput => {
  const now = new Date().toISOString();
  return {
    id: `temp-list-${Date.now()}`,
    name: variables.name,
    description: variables.description ?? null,
    ownerId: OPTIMISTIC_OWNER_ID,
    isPublic: variables.isPublic ?? false,
    createdAt: now,
    updatedAt: now,
    places: [],
    createdBy: null,
    users: [],
  };
};

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
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.lists.all());
        const previousLists = utils.getData<ListGetAllOutput>(queryKeys.lists.all());
        const optimisticList = createOptimisticList(variables);

        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? [];
          return [optimisticList, ...existing];
        });

        return {
          previousLists,
          optimisticId: optimisticList.id,
        };
      },
      onSuccess: (result, variables, context, mutationContext) => {
        const optimisticId =
          typeof context === 'object' &&
          context !== null &&
          'optimisticId' in context &&
          typeof context.optimisticId === 'string'
            ? context.optimisticId
            : null;

        if (optimisticId) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
            const existing = old ?? [];
            return existing.map((list) => (list.id === optimisticId ? result : list));
          });
          utils.remove(queryKeys.lists.get(optimisticId));
        }

        utils.setData<ListGetByIdOutput>(queryKeys.lists.get(result.id), result);
        utils.invalidate(queryKeys.lists.all());
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' &&
          context !== null &&
          'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined;

        if (previousLists) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), previousLists);
        }

        options?.onError?.(error, variables, context, mutationContext);
      },
      onSettled: () => {
        utils.invalidate(queryKeys.lists.all());
      },
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
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.lists.all());
        await utils.cancel(queryKeys.lists.get(variables.id));

        const previousLists = utils.getData<ListGetAllOutput>(queryKeys.lists.all());
        const previousList = utils.getData<ListGetByIdOutput>(queryKeys.lists.get(variables.id));

        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? [];
          return existing.map((list) =>
            list.id === variables.id ? { ...list, ...variables } : list,
          );
        });

        if (previousList) {
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.id), {
            ...previousList,
            ...variables,
          });
        }

        return { previousLists, previousList };
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? [];
          return existing.map((list) => (list.id === result.id ? result : list));
        });
        utils.setData<ListGetByIdOutput>(queryKeys.lists.get(result.id), result);
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.lists.get(result.id));
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' &&
          context !== null &&
          'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined;
        const previousList =
          typeof context === 'object' &&
          context !== null &&
          'previousList' in context
            ? (context as { previousList?: ListGetByIdOutput }).previousList
            : undefined;

        if (previousLists) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), previousLists);
        }
        if (previousList) {
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.id), previousList);
        }

        options?.onError?.(error, variables, context, mutationContext);
      },
      onSettled: (_result, _error, variables) => {
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.lists.get(variables.id));
      },
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
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.lists.all());
        const previousLists = utils.getData<ListGetAllOutput>(queryKeys.lists.all());

        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? [];
          return existing.filter((list) => list.id !== variables.id);
        });
        utils.remove(queryKeys.lists.get(variables.id));

        return { previousLists };
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.lists.all());
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' &&
          context !== null &&
          'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined;

        if (previousLists) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), previousLists);
        }

        options?.onError?.(error, variables, context, mutationContext);
      },
      onSettled: () => {
        utils.invalidate(queryKeys.lists.all());
      },
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
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.lists.all());
        await utils.cancel(queryKeys.lists.get(variables.listId));

        const previousLists = utils.getData<ListGetAllOutput>(queryKeys.lists.all());
        const previousList = utils.getData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId));

        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? [];
          return existing.map((list) => {
            if (list.id !== variables.listId) return list;
            const updatedPlaces = list.places.filter((place) => place.id !== variables.itemId);
            const updatedItems = list.items?.filter((item) => item.id !== variables.itemId);
            return {
              ...list,
              places: updatedPlaces,
              ...(updatedItems ? { items: updatedItems } : {}),
            };
          });
        });

        if (previousList) {
          const updatedPlaces = previousList.places.filter((place) => place.id !== variables.itemId);
          const updatedItems = previousList.items?.filter((item) => item.id !== variables.itemId);
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId), {
            ...previousList,
            places: updatedPlaces,
            ...(updatedItems ? { items: updatedItems } : {}),
          });
        }

        return { previousLists, previousList };
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.lists.get(variables.listId));
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' &&
          context !== null &&
          'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined;
        const previousList =
          typeof context === 'object' &&
          context !== null &&
          'previousList' in context
            ? (context as { previousList?: ListGetByIdOutput }).previousList
            : undefined;

        if (previousLists) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), previousLists);
        }
        if (previousList) {
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId), previousList);
        }

        options?.onError?.(error, variables, context, mutationContext);
      },
      onSettled: (_result, _error, variables) => {
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.lists.get(variables.listId));
      },
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
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.lists.all());
        await utils.cancel(queryKeys.lists.get(variables.listId));

        const previousLists = utils.getData<ListGetAllOutput>(queryKeys.lists.all());
        const previousList = utils.getData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId));

        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? [];
          return existing.map((list) => {
            if (list.id !== variables.listId || !list.users) return list;
            return {
              ...list,
              users: list.users.filter((user) => user.id !== variables.userId),
            };
          });
        });

        if (previousList && previousList.users) {
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId), {
            ...previousList,
            users: previousList.users.filter((user) => user.id !== variables.userId),
          });
        }

        return { previousLists, previousList };
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.lists.get(variables.listId));
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' &&
          context !== null &&
          'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined;
        const previousList =
          typeof context === 'object' &&
          context !== null &&
          'previousList' in context
            ? (context as { previousList?: ListGetByIdOutput }).previousList
            : undefined;

        if (previousLists) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), previousLists);
        }
        if (previousList) {
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId), previousList);
        }

        options?.onError?.(error, variables, context, mutationContext);
      },
      onSettled: (_result, _error, variables) => {
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.lists.get(variables.listId));
      },
    },
  );
};
