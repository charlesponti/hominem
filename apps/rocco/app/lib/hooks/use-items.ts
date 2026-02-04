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
      onSuccess: (result: ItemsAddToListOutput, variables: ItemsAddToListInput) => {
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
    async (client: HonoClient, variables: ItemsRemoveFromListInput) => {
      const res = await client.api.items.remove.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result: ItemsRemoveFromListOutput, variables: ItemsRemoveFromListInput) => {
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
    async (client: HonoClient) => {
      if (!listId) return [] as unknown as ItemsGetByListIdOutput;
      const res = await client.api.items['by-list'].$post({ json: { listId } });
      return res.json();
    },
    {
      enabled: !!listId,
    },
  );
