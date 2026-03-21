import type { Note } from '@hominem/rpc/types'
import { useApiClient } from '@hominem/rpc/react'
import { useQuery } from '@tanstack/react-query'

import { focusKeys } from './query-keys'

export const useFocusQuery = ({
  enabled = true,
}: {
  enabled?: boolean
}) => {
  const client = useApiClient()

  return useQuery<Note[]>({
    queryKey: focusKeys.all,
    queryFn: async () => {
      const payload = await client.notes.listFocusItems()
      return payload.notes
    },
    initialData: [],
    enabled,
  })
}
