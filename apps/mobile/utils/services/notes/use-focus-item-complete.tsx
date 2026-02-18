import { useMutation } from '@tanstack/react-query'

import { useHonoClient } from '@hominem/hono-client/react'

import type { FocusItem } from '~/utils/services/notes/types'
import { LocalStore } from '~/utils/local-store'
import { noteToFocusItem, toLocalFocusItem } from './local-focus'

type UseFocusItemComplete = {
  onSuccess?: (data: FocusItem) => void
  onError?: (error: Error) => void
}

export const useFocusItemComplete = ({ onSuccess, onError }: UseFocusItemComplete) => {
  const client = useHonoClient()

  return useMutation({
    mutationKey: ['completeItem'],
    mutationFn: async (id: string) => {
      const response = await client.api.notes[':id'].archive.$post({
        param: { id },
      })

      const archivedNote = (await response.json()) as Parameters<typeof noteToFocusItem>[0]
      const mapped = {
        ...noteToFocusItem(archivedNote),
        state: 'completed' as const,
      }

      await LocalStore.upsertFocusItem(toLocalFocusItem(mapped))
      return mapped
    },
    onSuccess,
    onError,
  })
}
