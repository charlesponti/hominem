import type {
  ItemsAddToListInput,
  ItemsAddToListOutput,
  ItemsRemoveFromListInput,
  ItemsRemoveFromListOutput,
  ItemsGetByListIdInput,
  ItemsGetByListIdOutput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client';

/**
 * Add item to list
 */
export const useAddItemToList = () => {
  const utils = useHonoUtils();
  return useHonoMutation<ItemsAddToListOutput, ItemsAddToListInput>(
    async (client, variables) => {
      const res = await client.api.items.add.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (_, variables) => {
        utils.invalidate(['items', 'by-list', variables.listId]);
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
    async (client, variables) => {
      const res = await client.api.items.remove.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (_, variables) => {
        utils.invalidate(['items', 'by-list', variables.listId]);
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
    async (client) => {
      if (!listId) return [];
      const res = await client.api.items['by-list'].$post({ json: { listId } });
      return res.json();
    },
    {
      enabled: !!listId,
    },
  );
