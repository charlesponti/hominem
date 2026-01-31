import { type InferInsertModel, type InferSelectModel } from 'drizzle-orm';
import { foreignKey, json, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

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
  ],
);
export type Chat = InferSelectModel<typeof chat>;
export type ChatInsert = InferInsertModel<typeof chat>;
export type ChatSelect = Chat;

export type ChatMessageReasoning = {
  type: 'reasoning' | 'redacted-reasoning';
  text: string;
  signature?: string;
};

export type ChatMessageToolCall = {
  type: 'tool-call' | 'tool-result';
  toolName: string;
  toolCallId: string;
  args?: Record<string, unknown>;
  result?: unknown;
  isError?: boolean;
};

export type ChatMessageFile = {
  type: 'image' | 'file';
  filename?: string;
  mimeType?: string;
  [key: string]: unknown;
};

export type ChatMessageRole = 'user' | 'assistant' | 'tool';

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
  ],
);
export type ChatMessage = InferSelectModel<typeof chatMessage>;
export type ChatMessageInsert = InferInsertModel<typeof chatMessage>;
export type ChatMessageSelect = ChatMessage;
