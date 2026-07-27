import { useApiClient } from '@hominem/rpc/react';
import type { Note } from '@hominem/rpc/types';
import { buildContentPreview } from '@hominem/utils/text';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';

import { invalidateInboxQueries } from '~/services/inbox/inbox-refresh';

import { noteKeys } from './query-keys';

interface CreateNoteInput {
  text: string;
  fileIds?: string[];
}

interface CreateNoteContext {
  optimisticId: string;
}

function buildOptimisticNote(text: string, optimisticId: string): Note {
  const now = new Date().toISOString();
  const trimmed = text.trim();

  return {
    id: optimisticId,
    title: null,
    content: trimmed,
    excerpt: buildContentPreview(null, trimmed) || null,
    status: 'draft',
    type: 'note',
    tags: [],
    mentions: [],
    analysis: null,
    publishingMetadata: null,
    parentNoteId: null,
    files: [],
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
      const res = await client.api.notes.$post({
        json: {
          content: input.text.trim(),
          ...(input.fileIds && input.fileIds.length > 0 ? { fileIds: input.fileIds } : {}),
          type: 'note',
        },
      });
      return res.json();
    },
    onMutate: async (input) => {
      const optimisticId = `optimistic-note-${Date.now().toString()}`;
      const optimisticNote = buildOptimisticNote(input.text, optimisticId);

      queryClient.setQueryData(noteKeys.detail(optimisticId), optimisticNote);

      return {
        optimisticId,
      };
    },
    onError: (_error, _input, context) => {
      if (context) {
        queryClient.removeQueries({ queryKey: noteKeys.detail(context.optimisticId), exact: true });
      }
    },
    onSuccess: async (createdNote, _input, context) => {
      if (context) {
        queryClient.removeQueries({ queryKey: noteKeys.detail(context.optimisticId), exact: true });
      }
      queryClient.setQueryData(noteKeys.detail(createdNote.id), createdNote);

      await invalidateInboxQueries(queryClient);
    },
  });
};
