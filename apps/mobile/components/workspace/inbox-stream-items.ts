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

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function getLines(value: string): string[] {
  return value
    .split('\n')
    .map(compactWhitespace)
    .filter(Boolean)
}

function getFocusTitle(item: Note): string {
  const title = compactWhitespace(item.title ?? '')
  if (title.length > 0) {
    return title
  }

  const excerptLines = getLines(item.excerpt ?? '')
  if (excerptLines[0]) {
    return excerptLines[0]
  }

  const contentLines = getLines(item.content ?? '')
  if (contentLines[0]) {
    return contentLines[0].slice(0, 80)
  }

  return 'Untitled note'
}

function getFocusPreview(item: Note, title: string): string | null {
  const bodyLines = [...getLines(item.excerpt ?? ''), ...getLines(item.content ?? '')]

  for (const line of bodyLines) {
    if (line !== title) {
      return line.slice(0, 140)
    }
  }

  return null
}

function toNoteStreamItem(item: Note): InboxStreamItem {
  const title = getFocusTitle(item)
  const timestamp = item.updatedAt || item.createdAt

  return {
    id: item.id,
    kind: 'note',
    title,
    preview: getFocusPreview(item, title),
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
