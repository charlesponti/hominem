/**
 * useInboxStream
 *
 * Fetches the merged notes+chats feed from GET /api/focus.
 * A single RPC call replaces the previous two parallel queries.
 */

import { useRpcQuery } from '@hominem/rpc/react'
import type { FocusItem } from '@hominem/rpc'

export type InboxStreamItem = FocusItem

export function useInboxStream(): {
  items: InboxStreamItem[]
  isLoading: boolean
} {
  const { data, isLoading } = useRpcQuery(
    ({ focus }) => focus.list(),
    {
      queryKey: ['focus'],
      staleTime: 1000 * 60,
    },
  )

  return {
    items: data?.items ?? [],
    isLoading,
  }
}
