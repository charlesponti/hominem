import type { HonoClient } from '@hominem/hono-client';
import type {
  ItemsAddToListInput,
  ItemsAddToListOutput,
  ItemsRemoveFromListInput,
  ItemsRemoveFromListOutput,
  ItemsGetByListIdOutput,
} from '@hominem/hono-rpc/types/items.types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Add item to list
 */
export const useAddItemToList = () => {
  const utils = useHonoUtils();
  return useHonoMutation<ItemsAddToListOutput, ItemsAddToListInput>(
    async (client: HonoClient, variables: ItemsAddToListInput) => {
      const res = await client.api.items.add.$post({ json: variables });
      return res.json();
    },
    {
      onMutate: async (variables) => {
        await utils.cancel(['items', 'by-list', variables.listId]);
        const previousItems = utils.getData<ItemsGetByListIdOutput>([
          'items',
          'by-list',
          variables.listId,
        ]);
        const now = new Date().toISOString();
        const optimisticItem: ItemsAddToListOutput = {
          id: `temp-item-${Date.now()}`,
          listId: variables.listId,
          itemId: variables.itemId,
          itemType: variables.itemType ?? 'PLACE',
          createdAt: now,
          updatedAt: now,
        };

        utils.setData<ItemsGetByListIdOutput>(['items', 'by-list', variables.listId], (old) => {
          const existing = old ?? [];
          return [optimisticItem, ...existing];
        });

        return { previousItems, optimisticId: optimisticItem.id };
      },
      onSuccess: (result: ItemsAddToListOutput, variables: ItemsAddToListInput) => {
        utils.setData<ItemsGetByListIdOutput>(['items', 'by-list', variables.listId], (old) => {
          const existing = old ?? [];
          return existing.map((item) => (item.itemId === result.itemId ? result : item));
        });
        utils.invalidate(['items', 'by-list', variables.listId]);
      },
      onError: (error, variables, context) => {
        const previousItems =
          typeof context === 'object' && context !== null && 'previousItems' in context
            ? (context as { previousItems?: ItemsGetByListIdOutput }).previousItems
            : undefined;

        if (previousItems) {
          utils.setData<ItemsGetByListIdOutput>(
            ['items', 'by-list', variables.listId],
            previousItems,
          );
        }

        console.error('Failed to add item to list:', error);
      },
    },
  );
};

/**
 * Remove item from list
 */
export const useRemoveItemFromList = () => {
  const utils = useHonoUtils();
  return useHonoMutation<ItemsRemoveFromListOutput, ItemsRemoveFromListInput>(
    async (client: HonoClient, variables: ItemsRemoveFromListInput) => {
      const res = await client.api.items.remove.$post({ json: variables });
      return res.json();
    },
    {
      onMutate: async (variables) => {
        await utils.cancel(['items', 'by-list', variables.listId]);
        const previousItems = utils.getData<ItemsGetByListIdOutput>([
          'items',
          'by-list',
          variables.listId,
        ]);

        utils.setData<ItemsGetByListIdOutput>(['items', 'by-list', variables.listId], (old) => {
          const existing = old ?? [];
          return existing.filter((item) => item.itemId !== variables.itemId);
        });

        return { previousItems };
      },
      onSuccess: (result: ItemsRemoveFromListOutput, variables: ItemsRemoveFromListInput) => {
        utils.invalidate(['items', 'by-list', variables.listId]);
      },
      onError: (error, variables, context) => {
        const previousItems =
          typeof context === 'object' && context !== null && 'previousItems' in context
            ? (context as { previousItems?: ItemsGetByListIdOutput }).previousItems
            : undefined;

        if (previousItems) {
          utils.setData<ItemsGetByListIdOutput>(
            ['items', 'by-list', variables.listId],
            previousItems,
          );
        }

        console.error('Failed to remove item from list:', error);
      },
    },
  );
};

/**
 * Get items in a list
 */
export const useListItems = (listId: string | undefined) =>
  useHonoQuery<ItemsGetByListIdOutput>(
    ['items', 'by-list', listId],
    async (client: HonoClient) => {
      if (!listId) return [] as unknown as ItemsGetByListIdOutput;
      const res = await client.api.items['by-list'].$post({ json: { listId } });
      return res.json();
    },
    {
      enabled: !!listId,
    },
  );
