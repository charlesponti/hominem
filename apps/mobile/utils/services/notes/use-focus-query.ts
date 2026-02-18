import { useQuery } from '@tanstack/react-query'

import { useHonoClient } from '@hominem/hono-client/react'

import { LocalStore } from '~/utils/local-store'
import type { FocusItems, FocusResponse } from './types'
import { fromLocalFocusItems, noteToFocusItem, toLocalFocusItem } from './local-focus'

export const useFocusQuery = ({
  onError,
  onSuccess,
  params,
}: {
  onError?: (error: Error) => void
  onSuccess?: (data: FocusResponse) => void
  params?: Record<string, string | string[] | number>
}) => {
  const client = useHonoClient()

  return useQuery<FocusItems | null>({
    queryKey: ['focusItems', params],
    queryFn: async () => {
      try {
        const response = await client.api.notes.$get({
          query: {
            status: 'draft,published',
            types: 'task,todo,goal,note',
          },
        })

        const payload = (await response.json()) as { notes: Parameters<typeof noteToFocusItem>[0][] }
        const mapped = payload.notes.map(noteToFocusItem)

        await Promise.all(mapped.map((item) => LocalStore.upsertFocusItem(toLocalFocusItem(item))))

        onSuccess?.({ items: mapped })
        return mapped
      } catch (error) {
        const localItems = await LocalStore.listFocusItems()
        if (localItems.length > 0) {
          const fallback = fromLocalFocusItems(localItems)
          return fallback
        }

        onError?.(error as Error)
        return null
      }
    },
  })
}
