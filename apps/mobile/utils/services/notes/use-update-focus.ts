import { useMutation, type UseMutationResult } from '@tanstack/react-query'

import { useHonoClient } from '@hominem/hono-client/react'

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

export const useUpdateFocusItem = (): UseMutationResult<
  FocusItem,
  Error,
  UpdateFocusItemInput
> => {
  const client = useHonoClient()

  return useMutation<FocusItem, Error, UpdateFocusItemInput>({
    mutationKey: ['updateFocusItem'],
    mutationFn: async (input: UpdateFocusItemInput) => {
      const response = await client.api.notes[':id'].$patch({
        param: { id: input.id },
        json: {
          title: input.text,
          excerpt: input.text,
          content: input.text,
          scheduledFor: input.due_date ? input.due_date.toISOString() : null,
          type: input.category || 'task',
        },
      })

      const updatedNote = (await response.json()) as Parameters<typeof noteToFocusItem>[0]
      const mapped = noteToFocusItem(updatedNote)

      await LocalStore.upsertFocusItem(toLocalFocusItem(mapped))

      return mapped
    },
  })
}
