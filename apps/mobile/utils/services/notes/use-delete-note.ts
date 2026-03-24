import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { noteKeys } from './query-keys';

interface UseDeleteNoteOptions {
  onSuccess?: (data: string) => void;
  onError?: (error: Error) => void;
}

export const useDeleteNote = (options?: UseDeleteNoteOptions) => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<string, Error, string>({
    mutationFn: async (id: string) => {
      await client.notes.delete({ id });
      return id;
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: noteKeys.all });
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
  });
};
