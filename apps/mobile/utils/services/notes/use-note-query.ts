import { useApiClient } from '@hominem/rpc/react';
import type { Note } from '@hominem/rpc/types';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { noteKeys } from './query-keys';

export const useNoteQuery = ({ noteId, enabled = true }: { noteId: string; enabled?: boolean }) => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useQuery<Note>({
    queryKey: noteKeys.detail(noteId),
    queryFn: async () => {
      const note = await client.notes.get({ id: noteId });

      queryClient.setQueryData<Note[]>(noteKeys.all, (current) => {
        if (!current) {
          return [note];
        }

        const hasNote = current.some((item) => item.id === note.id);
        if (hasNote) {
          return current.map((item) => (item.id === note.id ? note : item));
        }

        return [note, ...current];
      });

      return note;
    },
    initialData: () => {
      const focusItems = queryClient.getQueryData<Note[]>(noteKeys.all);
      return focusItems?.find((item) => item.id === noteId);
    },
    enabled: enabled && noteId.length > 0,
  });
};
