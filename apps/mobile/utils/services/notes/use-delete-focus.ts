import { useApiClient } from '@hominem/hono-client/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { LocalStore } from '~/utils/local-store';

import { focusKeys } from './query-keys';

interface UseDeleteFocusOptions {
  onSuccess?: (data: string) => void;
  onError?: (error: Error) => void;
}

export const useDeleteFocus = (options?: UseDeleteFocusOptions) => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<string, Error, string>({
    mutationFn: async (id: string) => {
      await client.notes.delete({ id });

      await LocalStore.deleteFocusItem(id);
      return id;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: focusKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};
