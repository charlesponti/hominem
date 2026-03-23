/**
 * useInboxStream
 *
 * Fetches the merged notes+chats feed from GET /api/focus.
 * A single RPC call replaces the previous two parallel queries.
 */

import { useRpcQuery } from '@hominem/rpc/react'
import type { FocusItem } from '@hominem/rpc'
import { focusQueryKeys } from '~/lib/query-keys'

export type { FocusItem as InboxStreamItem } from '@hominem/rpc'

export function useInboxStream(): {
  items: FocusItem[]
  isLoading: boolean
} {
  const { data, isLoading } = useRpcQuery(
    ({ focus }) => focus.list(),
    {
      queryKey: focusQueryKeys.all,
      staleTime: 1000 * 60,
    },
  )

  return {
    items: data?.items ?? [],
    isLoading,
  }
}
