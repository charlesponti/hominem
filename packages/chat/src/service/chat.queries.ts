import { db, takeUniqueOrThrow, and, desc, eq } from '@hominem/db';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import type { ChatOutput } from '../contracts';
import type { CreateChatParams } from './chat.types';

const chatMessageRoleEnum = pgEnum('chat_message_role', ['system', 'user', 'assistant', 'tool']);

const chatsTable = pgTable('chat', {
  id: uuid('id').primaryKey().notNull(),
  title: text('title').notNull(),
  userId: uuid('user_id').notNull(),
  noteId: uuid('note_id'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

const chatMessagesTable = pgTable('chat_message', {
  id: uuid('id').primaryKey().notNull(),
  chatId: uuid('chat_id').notNull(),
  userId: uuid('user_id').notNull(),
  role: chatMessageRoleEnum('role').notNull(),
  content: text('content').notNull(),
  files: jsonb('files'),
  toolCalls: jsonb('tool_calls'),
  reasoning: text('reasoning'),
  parentMessageId: uuid('parent_message_id'),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
});

export async function createChatQuery(params: CreateChatParams): Promise<ChatOutput> {
  const chatId = crypto.randomUUID();
  const now = new Date().toISOString();

  const [newChat] = await db
    .insert(chatsTable)
    .values({
      id: chatId,
      title: params.title,
      userId: params.userId,
      noteId: params.noteId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return newChat as ChatOutput;
}

export async function getChatByIdQuery(chatId: string, userId: string): Promise<ChatOutput | null> {
  const [chatData] = await db
    .select()
    .from(chatsTable)
    .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, userId)))
    .limit(1);

  return chatData ?? null;
}

export async function getOrCreateActiveChatQuery(
  userId: string,
  chatId?: string,
): Promise<ChatOutput> {
  if (chatId) {
    const existingChat = await db
      .select()
      .from(chatsTable)
      .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, userId)))
      .limit(1)
      .then(takeUniqueOrThrow)
      .catch(() => null);

    if (existingChat) {
      return existingChat as ChatOutput;
    }
  }

  const newChat = await db
    .insert(chatsTable)
    .values({
      id: crypto.randomUUID(),
      title: 'New Chat',
      userId: userId,
    })
    .returning()
    .then(takeUniqueOrThrow);

  return newChat as ChatOutput;
}

export async function getUserChatsQuery(userId: string, limit = 50): Promise<ChatOutput[]> {
  const chats = await db
    .select()
    .from(chatsTable)
    .where(eq(chatsTable.userId, userId))
    .orderBy(desc(chatsTable.updatedAt))
    .limit(limit);

  return chats as ChatOutput[];
}

export async function getChatByNoteIdQuery(
  noteId: string,
  userId: string,
): Promise<ChatOutput | null> {
  const [chatData] = await db
    .select()
    .from(chatsTable)
    .where(and(eq(chatsTable.noteId, noteId), eq(chatsTable.userId, userId)))
    .limit(1);

  return chatData ?? null;
}

export async function updateChatTitleQuery(
  chatId: string,
  title: string,
  userId: string,
): Promise<ChatOutput | null> {
  const [updatedChat] = await db
    .update(chatsTable)
    .set({
      title: title,
      updatedAt: new Date().toISOString(),
    })
    .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, userId)))
    .returning();

  return updatedChat ?? null;
}

export async function deleteChatQuery(chatId: string, userId: string): Promise<boolean> {
  const [existingChat] = await db
    .select({ id: chatsTable.id })
    .from(chatsTable)
    .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, userId)))
    .limit(1);

  if (!existingChat) {
    return false;
  }

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.chatId, chatId));
  await db.delete(chatsTable).where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, userId)));
  return true;
}

export async function clearChatMessagesQuery(chatId: string, userId: string): Promise<boolean> {
  const [existingChat] = await db
    .select({ id: chatsTable.id })
    .from(chatsTable)
    .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, userId)))
    .limit(1);

  if (!existingChat) {
    return false;
  }

  await db.delete(chatMessagesTable).where(eq(chatMessagesTable.chatId, chatId));
  return true;
}
