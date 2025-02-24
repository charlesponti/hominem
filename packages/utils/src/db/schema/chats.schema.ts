import { relations } from 'drizzle-orm'
import { foreignKey, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
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

export const chatMessage = pgTable(
  'chat_message',
  {
    id: uuid('id').primaryKey().notNull(),
    chatId: uuid('chatId').notNull(),
    userId: uuid('userId').notNull(),
    role: text('role').notNull(),
    content: text('content').notNull(),
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
