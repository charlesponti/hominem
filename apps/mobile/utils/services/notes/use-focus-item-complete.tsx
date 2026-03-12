import { useApiClient } from '@hominem/hono-client/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { LocalStore } from '~/utils/local-store';
import type { FocusItem } from '~/utils/services/notes/types';

import { noteToFocusItem, toLocalFocusItem } from './local-focus';
import { focusKeys } from './query-keys';

interface UseFocusItemCompleteOptions {
  onSuccess?: (data: FocusItem) => void;
  onError?: (error: Error) => void;
}

export const useFocusItemComplete = (options?: UseFocusItemCompleteOptions) => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['completeItem'],
    mutationFn: async (id: string) => {
      const archivedNote = await client.notes.archive({ id });
      const mapped = {
        ...noteToFocusItem(archivedNote),
        state: 'completed' as const,
      };

      await LocalStore.upsertFocusItem(toLocalFocusItem(mapped));
      return mapped;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: focusKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error as Error);
    },
  });
};
