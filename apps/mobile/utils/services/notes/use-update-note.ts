import type { NotesUpdateByIdInput } from '@hominem/rpc';
import { useApiClient } from '@hominem/rpc/react';
import type { Note } from '@hominem/rpc/types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { noteKeys } from './query-keys';

export interface UpdateNoteInput {
  id: string;
  text: string;
  category: string;
  fileIds?: string[];
  scheduledFor?: Date | null;
  timezone: string;
}

function toNoteType(
  category: string,
):
  | 'task'
  | 'note'
  | 'timer'
  | 'document'
  | 'journal'
  | 'tweet'
  | 'essay'
  | 'blog_post'
  | 'social_post' {
  switch (category) {
    case 'task':
    case 'note':
    case 'timer':
    case 'document':
    case 'journal':
    case 'tweet':
    case 'essay':
    case 'blog_post':
    case 'social_post':
      return category;
    default:
      return 'task';
  }
}

export function buildUpdateNoteInput(
  input: Omit<UpdateNoteInput, 'timezone'>,
): NotesUpdateByIdInput {
  const scheduledFor = input.scheduledFor ? input.scheduledFor.toISOString() : null;

  return {
    id: input.id,
    title: input.text,
    excerpt: input.text,
    content: input.text,
    type: toNoteType(input.category),
    ...(input.fileIds && input.fileIds.length > 0 ? { fileIds: input.fileIds } : {}),
    ...(input.scheduledFor !== undefined ? { scheduledFor } : {}),
  };
}

export const useUpdateNote = (): UseMutationResult<Note, Error, UpdateNoteInput> => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Note, Error, UpdateNoteInput>({
    mutationKey: ['updateNote'],
    mutationFn: async (input: UpdateNoteInput) => {
      const updatedNote = await client.notes.update(buildUpdateNoteInput(input));

      return updatedNote;
    },
    onSuccess: async (updatedNote, input) => {
      queryClient.setQueryData<Note[]>(noteKeys.all, (current) => {
        if (!current) {
          return [updatedNote];
        }

        const hasNote = current.some((item) => item.id === updatedNote.id);
        if (hasNote) {
          return current.map((item) => (item.id === updatedNote.id ? updatedNote : item));
        }

        return [updatedNote, ...current];
      });
      queryClient.setQueryData(noteKeys.detail(input.id), updatedNote);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: noteKeys.all }),
        queryClient.invalidateQueries({ queryKey: noteKeys.detail(input.id) }),
      ]);
    },
  });
};
