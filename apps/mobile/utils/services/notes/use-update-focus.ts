import type { Note } from '@hominem/hono-rpc/types'
import type { NotesUpdateByIdInput } from '@hominem/hono-client'
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
      return category
    default:
      return 'task'
  }
}

export function buildUpdateFocusNoteInput(
  input: Omit<UpdateFocusItemInput, 'timezone'>,
): NotesUpdateByIdInput {
  const scheduledFor = input.scheduledFor ? input.scheduledFor.toISOString() : null

  return {
    id: input.id,
    title: input.text,
    excerpt: input.text,
    content: input.text,
    type: toNoteType(input.category),
    ...(input.scheduledFor !== undefined ? { scheduledFor } : {}),
  }
}

export const useUpdateFocusItem = (): UseMutationResult<Note, Error, UpdateFocusItemInput> => {
  const client = useApiClient()
  const queryClient = useQueryClient()

  return useMutation<Note, Error, UpdateFocusItemInput>({
    mutationKey: ['updateFocusItem'],
    mutationFn: async (input: UpdateFocusItemInput) => {
      const updatedNote = await client.notes.update(buildUpdateFocusNoteInput(input))

      return updatedNote
    },
    onSuccess: async (updatedNote, input) => {
      queryClient.setQueryData<Note[]>(focusKeys.all, (current) => {
        if (!current) {
          return [updatedNote]
        }

        const hasNote = current.some((item) => item.id === updatedNote.id)
        if (hasNote) {
          return current.map((item) => (item.id === updatedNote.id ? updatedNote : item))
        }

        return [updatedNote, ...current]
      })
      queryClient.setQueryData(focusKeys.detail(input.id), updatedNote)

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: focusKeys.all }),
        queryClient.invalidateQueries({ queryKey: focusKeys.detail(input.id) }),
      ])
    },
  })
}
