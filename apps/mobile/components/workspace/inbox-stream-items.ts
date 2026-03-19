import type { ChatWithActivity } from '~/utils/services/chat/session-state'
import type { FocusItem } from '~/utils/services/notes/types'

export interface InboxStreamItem {
  id: string
  kind: 'note' | 'chat'
  title: string
  preview: string
  timestamp: string
  route: string
}

interface ToInboxStreamItemsInput {
  focusItems: FocusItem[]
  sessions: ChatWithActivity[]
}

function toNoteStreamItem(item: FocusItem): InboxStreamItem {
  const trimmedText = item.text.trim()
  const title = item.source_note?.title ?? (trimmedText.length > 0 ? trimmedText : 'Untitled note')

  return {
    id: item.id,
    kind: 'note',
    title,
    preview: 'Note',
    timestamp: item.updated_at,
    route: `/(protected)/(tabs)/focus/${item.id}`,
  }
}

function toChatStreamItem(session: ChatWithActivity): InboxStreamItem {
  return {
    id: session.id,
    kind: 'chat',
    title: session.title ?? 'Untitled session',
    preview: 'Conversation activity',
    timestamp: session.activityAt,
    route: `/(protected)/(tabs)/sherpa?chatId=${session.id}`,
  }
}

export function toInboxStreamItems(input: ToInboxStreamItemsInput): InboxStreamItem[] {
  return [
    ...input.focusItems.map(toNoteStreamItem),
    ...input.sessions.map(toChatStreamItem),
  ].sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
}
