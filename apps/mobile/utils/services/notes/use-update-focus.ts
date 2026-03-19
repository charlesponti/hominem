import type { Note } from '@hominem/hono-rpc/types'
import { useApiClient } from '@hominem/hono-client/react'
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query'

import { focusKeys } from './query-keys'

export interface UpdateFocusItemInput {
  id: string
  text: string
  category: string
  scheduledFor?: Date | null
  timezone: string
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

export const useUpdateFocusItem = (): UseMutationResult<Note, Error, UpdateFocusItemInput> => {
  const client = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<Note, Error, UpdateFocusItemInput>({
    mutationKey: ['updateFocusItem'],
    mutationFn: async (input: UpdateFocusItemInput) => {
      const scheduledFor = input.scheduledFor ? input.scheduledFor.toISOString() : null
      const updatedNote = await client.notes.update({
        id: input.id,
        title: input.text,
        excerpt: input.text,
        content: input.text,
        type: toNoteType(input.category),
        ...(input.scheduledFor !== undefined ? { scheduledFor } : {}),
      })

      return updatedNote
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: focusKeys.all })
    },
  })
}
