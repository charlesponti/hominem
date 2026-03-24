import { useApiClient } from '@hominem/rpc/react';
import type { Note } from '@hominem/rpc/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { noteKeys } from './query-keys';

interface UseNoteCompleteOptions {
  onSuccess?: (data: Note) => void;
  onError?: (error: Error) => void;
}

export const useNoteComplete = (options?: UseNoteCompleteOptions) => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Note, Error, string>({
    mutationKey: ['completeItem'],
    mutationFn: async (id: string) => {
      return client.notes.archive({ id });
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: noteKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error as Error);
    },
  });
};
