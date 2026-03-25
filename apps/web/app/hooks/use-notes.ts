import { useRpcMutation, useRpcQuery } from '@hominem/rpc/react';
import type {
  NotesListInput,
  NotesCreateInput,
  NotesCreateOutput,
  NotesUpdateInput,
  NotesUpdateOutput,
  NotesDeleteOutput,
} from '@hominem/rpc/types/notes.types';
import { useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions } from '@tanstack/react-query';

import { notesQueryKeys } from '~/lib/query-keys';

interface UseNotesListOptions {
  enabled?: boolean;
}

export function useNotesList(
  options: NotesListInput = {},
  queryOptions: UseNotesListOptions = {},
) {
  return useRpcQuery(
    async ({ notes }) => {
      const data = await notes.list(options);
      return Array.isArray(data.notes) ? data.notes : [];
    },
    {
      enabled: queryOptions.enabled ?? true,
      queryKey: notesQueryKeys.list(options),
      staleTime: 1000 * 60 * 1, // 1 minute
    },
  );
}

export function useNote(id: string) {
  return useRpcQuery(({ notes }) => notes.get({ id }), {
    queryKey: notesQueryKeys.detail(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useRpcMutation<NotesCreateOutput, NotesCreateInput>(
    ({ notes }, variables) => notes.create(variables),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: notesQueryKeys.list() });
      },
    },
  );
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useRpcMutation<NotesUpdateOutput, { id: string } & NotesUpdateInput>(
    ({ notes }, variables) => notes.update(variables),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: notesQueryKeys.list() });
      },
    },
  );
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useRpcMutation<NotesDeleteOutput, { id: string }>(
    ({ notes }, variables) => notes.delete(variables),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: notesQueryKeys.list() });
      },
    },
  );
}
