import type { HonoClient } from '@hominem/hono-client';
import type {
  ItemsAddToListInput,
  ItemsAddToListOutput,
  ItemsRemoveFromListInput,
  ItemsRemoveFromListOutput,
  ItemsGetByListIdOutput,
} from '@hominem/hono-rpc/types';
import type { ApiResult } from '@hominem/services';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Add item to list
 */
export const useAddItemToList = () => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<ItemsAddToListOutput>, ItemsAddToListInput>(
    async (client: HonoClient, variables: ItemsAddToListInput) => {
      const res = await client.api.items.add.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result: ApiResult<ItemsAddToListOutput>, variables: ItemsAddToListInput) => {
        if (result.success) {
          utils.invalidate(['items', 'by-list', variables.listId]);
        }
      },
    },
  );
};

/**
 * Remove item from list
 */
export const useRemoveItemFromList = () => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<ItemsRemoveFromListOutput>, ItemsRemoveFromListInput>(
    async (client: HonoClient, variables: ItemsRemoveFromListInput) => {
      const res = await client.api.items.remove.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (
        result: ApiResult<ItemsRemoveFromListOutput>,
        variables: ItemsRemoveFromListInput,
      ) => {
        if (result.success) {
          utils.invalidate(['items', 'by-list', variables.listId]);
        }
      },
    },
  );
};

/**
 * Get items in a list
 */
export const useListItems = (listId: string | undefined) =>
  useHonoQuery<ApiResult<ItemsGetByListIdOutput>>(
    ['items', 'by-list', listId],
    async (client: HonoClient) => {
      if (!listId) return { success: true, data: [] };
      const res = await client.api.items['by-list'].$post({ json: { listId } });
      return res.json();
    },
    {
      enabled: !!listId,
    },
  );
