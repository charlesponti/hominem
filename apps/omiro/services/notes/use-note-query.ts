import { useApiClient } from '@hominem/rpc/react';
import type { Note } from '@hominem/rpc/types';
import { useQuery } from '@tanstack/react-query';

import { hasDefinedData, resolveRestoredQueryState } from '~/services/query/restored-query-state';

import { noteKeys } from './query-keys';

export const useNoteQuery = ({ noteId, enabled = true }: { noteId: string; enabled?: boolean }) => {
  const client = useApiClient();
  const noteQuery = useQuery<Note>({
    queryKey: noteKeys.detail(noteId),
    queryFn: async () => {
      const res = await client.api.notes[':id'].$get({ param: { id: noteId } });
      return res.json();
    },
    enabled: enabled && noteId.length > 0,
  });

  const restoredState = resolveRestoredQueryState({
    data: noteQuery.data,
    isPending: noteQuery.isPending,
    isFetching: noteQuery.isFetching,
    hasUsableData: hasDefinedData,
  });

  return {
    ...noteQuery,
    hasUsableData: restoredState.hasUsableData,
    isInitialLoading: restoredState.isInitialLoading,
    isRefreshing: restoredState.isRefreshing,
  };
};
