import { useMutation, type UseMutationResult } from '@tanstack/react-query'

import { useApiClient } from '@hominem/hono-client/react'

import { LocalStore } from '~/utils/local-store'
import { noteToFocusItem, toLocalFocusItem } from './local-focus'
import type { FocusItem } from './types'

export interface UpdateFocusItemInput {
  id: string
  text: string
  due_date?: Date
  category: string
  timezone: string
}

function toNoteType(
  category: string,
): 'task' | 'note' | 'timer' | 'document' | 'journal' | 'tweet' | 'essay' | 'blog_post' | 'social_post' {
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

export const useUpdateFocusItem = (): UseMutationResult<
  FocusItem,
  Error,
  UpdateFocusItemInput
> => {
  const client = useApiClient()

  return useMutation<FocusItem, Error, UpdateFocusItemInput>({
    mutationKey: ['updateFocusItem'],
    mutationFn: async (input: UpdateFocusItemInput) => {
      const updatedNote = await client.notes.update({
        id: input.id,
        title: input.text,
        excerpt: input.text,
        content: input.text,
        type: toNoteType(input.category),
      })
      const mapped = noteToFocusItem(updatedNote)

      await LocalStore.upsertFocusItem(toLocalFocusItem(mapped))

      return mapped
    },
  })
}
