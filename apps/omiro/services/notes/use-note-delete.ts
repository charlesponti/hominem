import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useInboxItemRemoval } from '~/services/inbox/use-inbox-item-removal';

import { noteKeys } from './query-keys';

interface UseNoteDeleteOptions {
  noteId: string;
}

export function useNoteDelete({ noteId }: UseNoteDeleteOptions) {
  const client = useApiClient();
  const queryClient = useQueryClient();
  const removal = useInboxItemRemoval({ kind: 'note', entityId: noteId });

  return useMutation({
    mutationFn: async () => {
      await client.api.notes[':id'].$delete({ param: { id: noteId } });
    },
    onMutate: removal.onMutate,
    onError: removal.onError,
    onSuccess: () => {
      removal.clearResumeTargetIfMatch();
      queryClient.removeQueries({ queryKey: noteKeys.detail(noteId), exact: true });
    },
  });
}
