import type { Note } from '@hominem/hono-rpc/types'
import type { ChatWithActivity } from '~/utils/services/chat/session-state'
import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp'

export interface InboxStreamItem {
  id: string
  kind: 'note' | 'chat'
  title: string
  preview: string | null
  timestamp: string
  route: string
}

interface ToInboxStreamItemsInput {
  focusItems: Note[]
  sessions: ChatWithActivity[]
}

function getFocusTitle(item: Note): string {
  if (item.title && item.title.trim().length > 0) {
    return item.title
  }
  if (item.excerpt && item.excerpt.trim().length > 0) {
    return item.excerpt
  }
  if (item.content && item.content.trim().length > 0) {
    return item.content.slice(0, 80)
  }
  return 'Untitled note'
}

function toNoteStreamItem(item: Note): InboxStreamItem {
  const timestamp = item.createdAt

  return {
    id: item.id,
    kind: 'note',
    title: getFocusTitle(item),
    preview: null,
    timestamp,
    route: `/(protected)/(tabs)/focus/${item.id}`,
  }
}

function toChatStreamItem(session: ChatWithActivity): InboxStreamItem {
  const timestamp = session.activityAt

  return {
    id: session.id,
    kind: 'chat',
    title: session.title ?? 'Untitled session',
    preview: null,
    timestamp,
    route: `/(protected)/(tabs)/sherpa?chatId=${session.id}`,
  }
}

function toSortTime(value: string): number {
  return parseInboxTimestamp(value).getTime()
}

export function toInboxStreamItems(input: ToInboxStreamItemsInput): InboxStreamItem[] {
  return [
    ...input.focusItems.map(toNoteStreamItem),
    ...input.sessions.map(toChatStreamItem),
  ].sort((left, right) => toSortTime(right.timestamp) - toSortTime(left.timestamp))
}
