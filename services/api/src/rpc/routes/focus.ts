import { db } from '@hominem/db'
import { Hono } from 'hono'

import { authMiddleware, type AppContext } from '../middleware/auth'
import { getUserChatsQuery } from '@hominem/chat-services'

export interface FocusItem {
  kind: 'note' | 'chat'
  id: string
  title: string
  preview: string | null
  updatedAt: string
}

function computeNoteTitle(
  title: string | null,
  excerpt: string | null,
  content: string | null,
): string {
  const compact = (s: string) => s.replace(/\s+/g, ' ').trim()
  const lines = (s: string | null) =>
    (s ?? '').split('\n').map(compact).filter(Boolean)

  const t = compact(title ?? '')
  if (t) return t

  const excerptLines = lines(excerpt)
  if (excerptLines[0]) return excerptLines[0]

  const contentLines = lines(content)
  return contentLines[0]?.slice(0, 80) ?? 'Untitled note'
}

function computeNotePreview(
  title: string,
  excerpt: string | null,
  content: string | null,
): string | null {
  const compact = (s: string) => s.replace(/\s+/g, ' ').trim()
  const lines = [excerpt, content]
    .flatMap((s) => (s ?? '').split('\n').map(compact).filter(Boolean))

  for (const line of lines) {
    if (line !== title) return line.slice(0, 140)
  }
  return null
}

export interface FocusListOutput {
  items: FocusItem[]
}

const NOTE_LIMIT = 100
const CHAT_LIMIT = 20

export const focusRoutes = new Hono<AppContext>()
  .use('*', authMiddleware)
  .get('/', async (c) => {
    const userId = c.get('userId')!

    const [noteRows, chats] = await Promise.all([
      db
        .selectFrom('notes')
        .select(['id', 'title', 'excerpt', 'content', 'updated_at'])
        .where('user_id', '=', userId)
        .where('is_latest_version', '=', true)
        .where('status', 'in', ['draft', 'published'])
        .orderBy('updated_at', 'desc')
        .limit(NOTE_LIMIT)
        .execute(),
      getUserChatsQuery(userId, CHAT_LIMIT),
    ])

    const noteItems: FocusItem[] = noteRows.map((row) => {
      const title = computeNoteTitle(row.title, row.excerpt, row.content)
      return {
        kind: 'note',
        id: row.id,
        title,
        preview: computeNotePreview(title, row.excerpt, row.content),
        updatedAt:
          row.updated_at instanceof Date
            ? row.updated_at.toISOString()
            : String(row.updated_at),
      }
    })

    const chatItems: FocusItem[] = chats.map((chat) => ({
      kind: 'chat',
      id: chat.id,
      title: chat.title?.trim() || 'Untitled session',
      preview: null,
      updatedAt: chat.updatedAt,
    }))

    const items = [...noteItems, ...chatItems].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )

    return c.json({ items } satisfies FocusListOutput)
  })
