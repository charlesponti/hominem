import { useApiClient } from '@hominem/rpc/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { removeInboxStreamItem } from '~/services/inbox/inbox-refresh';
import { clearResumeTarget, readResumeTarget } from '~/services/navigation/launch-state';
import { inboxKeys } from '~/services/notes/query-keys';

import { noteKeys } from './query-keys';

interface UseNoteDeleteOptions {
  noteId: string;
}

export function useNoteDelete({ noteId }: UseNoteDeleteOptions) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await client.api.notes[':id'].$delete({ param: { id: noteId } });
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: inboxKeys.pages() });
      const previousInboxPages = queryClient.getQueriesData({
        queryKey: inboxKeys.pages(),
      });

      removeInboxStreamItem(queryClient, { kind: 'note', entityId: noteId });

      return { previousInboxPages };
    },
    onError: (_error, _variables, context) => {
      context?.previousInboxPages.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSuccess: () => {
      if (readResumeTarget()?.id === noteId) {
        clearResumeTarget();
      }
      queryClient.removeQueries({ queryKey: noteKeys.detail(noteId), exact: true });
    },
  });
}
