import { useApiClient } from '@hominem/hono-client/react';
import { useQuery } from '@tanstack/react-query';

import { LocalStore } from '~/utils/local-store';
import { validateNotesResponse } from '~/utils/validation/schemas';

import { fromLocalFocusItems, noteToFocusItem, toLocalFocusItem } from './local-focus';
import { focusKeys } from './query-keys';
import type { FocusItems, FocusResponse } from './types';

export const useFocusQuery = ({
  onError,
  onSuccess,
}: {
  onError?: (error: Error) => void;
  onSuccess?: (data: FocusResponse) => void;
}) => {
  const client = useApiClient();

  return useQuery<FocusItems | null>({
    queryKey: focusKeys.all,
    queryFn: async () => {
      try {
        const payload = validateNotesResponse(await client.notes.listFocusItems());
        const mapped = payload.notes.map(noteToFocusItem);

        await Promise.all(mapped.map((item) => LocalStore.upsertFocusItem(toLocalFocusItem(item))));

        onSuccess?.({ items: mapped });
        return mapped;
      } catch (error) {
        const localItems = await LocalStore.listFocusItems();
        if (localItems.length > 0) {
          const fallback = fromLocalFocusItems(localItems);
          return fallback;
        }

        onError?.(error as Error);
        return null;
      }
    },
  });
};
