import { relations } from 'drizzle-orm'
import { foreignKey, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users.schema'

export const chat = pgTable(
  'chat',
  {
    id: uuid('id').primaryKey().notNull(),
    title: text('title').notNull(),
    userId: uuid('userId').notNull(),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'chat_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)
export type Chat = typeof chat.$inferSelect
export type ChatSelect = typeof chat.$inferSelect
export type ChatInsert = typeof chat.$inferInsert

export type ChatMessageReasoning = {
  type: 'reasoning' | 'redacted-reasoning'
  text: string
  signature?: string
}

export type ChatMessageToolCall = {
  type: 'tool-call' | 'tool-result'
  toolName: string
  toolCallId: string
  args?: Record<string, unknown>
  result?: unknown
  isError?: boolean
}

export type ChatMessageFile = {
  type: 'image' | 'file'
  filename?: string
  mimeType?: string
  [key: string]: unknown
}

export type ChatMessageRole = 'user' | 'assistant' | 'tool'

export const chatMessage = pgTable(
  'chat_message',
  {
    id: uuid('id').primaryKey().notNull(),
    chatId: uuid('chatId').notNull(),
    userId: uuid('userId').notNull(),
    role: text('role').$type<ChatMessageRole>().notNull(),
    content: text('content').notNull(),
    toolCalls: json('toolCalls').$type<ChatMessageToolCall[]>(),
    reasoning: text('reasoning'),
    files: json('files').$type<ChatMessageFile[]>(),
    parentMessageId: uuid('parentMessageId'),
    messageIndex: text('messageIndex'),
    createdAt: timestamp('createdAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
    updatedAt: timestamp('updatedAt', { precision: 3, mode: 'string' }).defaultNow().notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
      name: 'chat_message_chatId_chat_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'chat_message_userId_user_id_fk',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
)
export type ChatMessageSelect = typeof chatMessage.$inferSelect
export type ChatMessageInsert = typeof chatMessage.$inferInsert

export const chatRelations = relations(chat, ({ one, many }) => ({
  user: one(users, {
    fields: [chat.userId],
    references: [users.id],
  }),
  chatMessages: many(chatMessage),
}))

export const chatMessageRelations = relations(chatMessage, ({ one }) => ({
  chat: one(chat, {
    fields: [chatMessage.chatId],
    references: [chat.id],
  }),
  user: one(users, {
    fields: [chatMessage.userId],
    references: [users.id],
  }),
}))
