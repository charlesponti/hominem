import { useApiClient } from '@hominem/rpc/react';
import type { Note } from '@hominem/rpc/types';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { noteKeys } from './query-keys';

export interface CreateNoteInput {
  text: string;
  fileIds?: string[];
}

interface CreateNoteContext {
  optimisticId: string;
  previousNotes: Note[] | undefined;
}

function buildOptimisticNote(text: string, optimisticId: string): Note {
  const now = new Date().toISOString();
  const trimmed = text.trim();
  const fallbackTitle = trimmed.slice(0, 80) || 'Untitled note';

  return {
    id: optimisticId,
    title: fallbackTitle,
    content: trimmed,
    excerpt: trimmed.slice(0, 160),
    status: 'draft',
    type: 'note',
    tags: [],
    mentions: [],
    analysis: null,
    publishingMetadata: null,
    parentNoteId: null,
    versionNumber: 1,
    isLatestVersion: true,
    userId: '',
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
    scheduledFor: null,
  };
}

export const useCreateNote = (): UseMutationResult<
  Note,
  Error,
  CreateNoteInput,
  CreateNoteContext
> => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  return useMutation<Note, Error, CreateNoteInput, CreateNoteContext>({
    mutationKey: ['createNote'],
    mutationFn: async (input) => {
      const trimmed = input.text.trim();
      const [firstLine = trimmed] = trimmed.split('\n');
      const createdNote = await client.notes.create({
        content: trimmed,
        ...(input.fileIds && input.fileIds.length > 0 ? { fileIds: input.fileIds } : {}),
        excerpt: trimmed.slice(0, 160),
        ...(firstLine.trim().length > 0 ? { title: firstLine.slice(0, 80) } : {}),
        type: 'note',
      });

      return createdNote;
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: noteKeys.all });

      const previousNotes = queryClient.getQueryData<Note[]>(noteKeys.all);
      const optimisticId = `optimistic-note-${Date.now().toString()}`;
      const optimisticNote = buildOptimisticNote(input.text, optimisticId);

      queryClient.setQueryData<Note[]>(noteKeys.all, (current) => [
        optimisticNote,
        ...(current ?? []),
      ]);

      return {
        optimisticId,
        previousNotes,
      };
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(noteKeys.all, context?.previousNotes ?? []);
    },
    onSuccess: async (createdNote, _input, context) => {
      queryClient.setQueryData<Note[]>(noteKeys.all, (current) => {
        const withoutOptimistic = (current ?? []).filter(
          (item) => item.id !== context?.optimisticId,
        );
        return [createdNote, ...withoutOptimistic];
      });

      await queryClient.invalidateQueries({ queryKey: noteKeys.all });
    },
  });
};
