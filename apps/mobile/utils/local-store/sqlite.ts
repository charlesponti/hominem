import * as SQLite from 'expo-sqlite'
import type { Chat, ChatMessage, FocusItem, Media, Settings, UserProfile } from './types'

type QueryResult = {
  rows: Array<Record<string, unknown>>
}

const DB_NAME = 'msc_cloud_store.db'

const toISO = (value: string | null | undefined) => value ?? new Date().toISOString()

const parseJson = <T>(value: string | null | undefined): T | null => {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

const stringifyJson = (value: unknown) => {
  if (value === undefined) return null
  return JSON.stringify(value)
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizeProfile = (row: Record<string, unknown>): UserProfile => ({
  id: String(row.id),
  name: typeof row.name === 'string' ? row.name : null,
  email: typeof row.email === 'string' ? row.email : null,
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
})

const normalizeChat = (row: Record<string, unknown>): Chat => ({
  id: String(row.id),
  createdAt: String(row.created_at),
  endedAt: typeof row.ended_at === 'string' ? row.ended_at : null,
  title: typeof row.title === 'string' ? row.title : null,
})

const normalizeMessage = (row: Record<string, unknown>): ChatMessage => ({
  id: String(row.id),
  chatId: String(row.chat_id),
  role: row.role === 'assistant' || row.role === 'system' ? row.role : 'user',
  content: String(row.content),
  createdAt: String(row.created_at),
  focusItemsJson: typeof row.focus_items_json === 'string' ? row.focus_items_json : null,
  focusIdsJson: typeof row.focus_ids_json === 'string' ? row.focus_ids_json : null,
})

const normalizeFocusItem = (row: Record<string, unknown>): FocusItem => ({
  id: String(row.id),
  text: String(row.text),
  status: String(row.status),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at),
  payloadJson: typeof row.payload_json === 'string' ? row.payload_json : null,
})

const normalizeSettings = (row: Record<string, unknown>): Settings => ({
  id: String(row.id),
  theme: typeof row.theme === 'string' ? row.theme : null,
  preferencesJson: typeof row.preferences_json === 'string' ? row.preferences_json : null,
})

const normalizeMedia = (row: Record<string, unknown>): Media => ({
  id: String(row.id),
  type: String(row.type),
  localURL: String(row.local_url),
  createdAt: String(row.created_at),
})

const execute = async (db: SQLite.SQLiteDatabase, sql: string, args: Array<string | number | null> = []) => {
  await db.runAsync(sql, args)
}

const getAll = async (db: SQLite.SQLiteDatabase, sql: string, args: Array<string | number | null> = []) => {
  const result = await db.getAllAsync<QueryResult>(sql, args)
  return result
}

const getFirst = async (db: SQLite.SQLiteDatabase, sql: string, args: Array<string | number | null> = []) => {
  const rows = await getAll(db, sql, args)
  return rows[0] ?? null
}

export const createSQLiteStore = async () => {
  const db = await SQLite.openDatabaseAsync(DB_NAME)

  await execute(
    db,
    'CREATE TABLE IF NOT EXISTS user_profile (id TEXT PRIMARY KEY, name TEXT, email TEXT, created_at TEXT, updated_at TEXT)'
  )
  await execute(
    db,
    'CREATE TABLE IF NOT EXISTS chats (id TEXT PRIMARY KEY, title TEXT, created_at TEXT, ended_at TEXT)'
  )
  await execute(
    db,
    'CREATE TABLE IF NOT EXISTS chat_messages (id TEXT PRIMARY KEY, chat_id TEXT, role TEXT, content TEXT, created_at TEXT, focus_items_json TEXT, focus_ids_json TEXT)'
  )
  await execute(
    db,
    'CREATE TABLE IF NOT EXISTS focus_items (id TEXT PRIMARY KEY, text TEXT, status TEXT, created_at TEXT, updated_at TEXT, payload_json TEXT)'
  )
  await execute(
    db,
    'CREATE TABLE IF NOT EXISTS settings (id TEXT PRIMARY KEY, theme TEXT, preferences_json TEXT)'
  )
  await execute(
    db,
    'CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, type TEXT, local_url TEXT, created_at TEXT)'
  )

  return {
    initialize: async () => true,
    getUserProfile: async () => {
      const row = await getFirst(db, 'SELECT * FROM user_profile LIMIT 1')
      return row ? normalizeProfile(row) : null
    },
    upsertUserProfile: async (profile: UserProfile) => {
      const createdAt = toISO(profile.createdAt)
      const updatedAt = toISO(profile.updatedAt)
      await execute(
        db,
        'INSERT INTO user_profile (id, name, email, created_at, updated_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET name=excluded.name, email=excluded.email, created_at=excluded.created_at, updated_at=excluded.updated_at',
        [profile.id, profile.name ?? null, profile.email ?? null, createdAt, updatedAt]
      )
      return { ...profile, createdAt, updatedAt }
    },
    createChat: async (chat: Chat) => {
      const createdAt = toISO(chat.createdAt)
      await execute(
        db,
        'INSERT OR REPLACE INTO chats (id, title, created_at, ended_at) VALUES (?, ?, ?, ?)',
        [chat.id, chat.title ?? null, createdAt, chat.endedAt ?? null]
      )
      return { ...chat, createdAt }
    },
    listChats: async () => {
      const rows = await getAll(db, 'SELECT * FROM chats ORDER BY created_at DESC')
      return rows.map(normalizeChat)
    },
    endChat: async (chatId: string, endedAt: string) => {
      await execute(
        db,
        'UPDATE chats SET ended_at = ? WHERE id = ?',
        [endedAt, chatId]
      )
      const row = await getFirst(db, 'SELECT * FROM chats WHERE id = ?', [chatId])
      if (row) return normalizeChat(row)
      return { id: chatId, createdAt: endedAt, endedAt }
    },
    addMessage: async (message: ChatMessage) => {
      const createdAt = toISO(message.createdAt)
      await execute(
        db,
        'INSERT OR REPLACE INTO chat_messages (id, chat_id, role, content, created_at, focus_items_json, focus_ids_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          message.id,
          message.chatId,
          message.role,
          message.content,
          createdAt,
          message.focusItemsJson ?? null,
          message.focusIdsJson ?? null,
        ]
      )
      return { ...message, createdAt }
    },
    listMessages: async (chatId: string) => {
      const rows = await getAll(
        db,
        'SELECT * FROM chat_messages WHERE chat_id = ? ORDER BY created_at ASC',
        [chatId]
      )
      return rows.map(normalizeMessage)
    },
    upsertFocusItem: async (item: FocusItem) => {
      const createdAt = toISO(item.createdAt)
      const updatedAt = toISO(item.updatedAt)
      await execute(
        db,
        'INSERT OR REPLACE INTO focus_items (id, text, status, created_at, updated_at, payload_json) VALUES (?, ?, ?, ?, ?, ?)',
        [item.id, item.text, item.status, createdAt, updatedAt, item.payloadJson ?? null]
      )
      return { ...item, createdAt, updatedAt }
    },
    listFocusItems: async () => {
      const rows = await getAll(db, 'SELECT * FROM focus_items ORDER BY created_at DESC')
      return rows.map(normalizeFocusItem)
    },
    deleteFocusItem: async (id: string) => {
      await execute(db, 'DELETE FROM focus_items WHERE id = ?', [id])
      return id
    },
    upsertSettings: async (nextSettings: Settings) => {
      await execute(
        db,
        'INSERT OR REPLACE INTO settings (id, theme, preferences_json) VALUES (?, ?, ?)',
        [nextSettings.id, nextSettings.theme ?? null, nextSettings.preferencesJson ?? null]
      )
      return nextSettings
    },
    getSettings: async () => {
      const row = await getFirst(db, 'SELECT * FROM settings LIMIT 1')
      return row ? normalizeSettings(row) : null
    },
    upsertMedia: async (media: Media) => {
      const createdAt = toISO(media.createdAt)
      await execute(
        db,
        'INSERT OR REPLACE INTO media (id, type, local_url, created_at) VALUES (?, ?, ?, ?)',
        [media.id, media.type, media.localURL, createdAt]
      )
      return { ...media, createdAt }
    },
    listMedia: async () => {
      const rows = await getAll(db, 'SELECT * FROM media ORDER BY created_at DESC')
      return rows.map(normalizeMedia)
    },
    clearAllData: async () => {
      await execute(db, 'DELETE FROM user_profile')
      await execute(db, 'DELETE FROM chats')
      await execute(db, 'DELETE FROM chat_messages')
      await execute(db, 'DELETE FROM focus_items')
      await execute(db, 'DELETE FROM settings')
      await execute(db, 'DELETE FROM media')
      return true
    },
  }
}

export const migrateInMemoryToSQLite = async (
  store: Awaited<ReturnType<typeof createSQLiteStore>>,
  snapshot: {
    userProfile: UserProfile | null
    settings: Settings | null
    chats: Chat[]
    messages: ChatMessage[]
    focusItems: FocusItem[]
    mediaItems: Media[]
  }
) => {
  if (snapshot.userProfile) {
    await store.upsertUserProfile(snapshot.userProfile)
  }
  if (snapshot.settings) {
    await store.upsertSettings(snapshot.settings)
  }
  for (const chat of snapshot.chats) {
    await store.createChat(chat)
  }
  for (const message of snapshot.messages) {
    await store.addMessage(message)
  }
  for (const item of snapshot.focusItems) {
    await store.upsertFocusItem(item)
  }
  for (const item of snapshot.mediaItems) {
    await store.upsertMedia(item)
  }
}
