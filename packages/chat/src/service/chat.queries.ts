import crypto from 'node:crypto';
import type { Selectable } from 'kysely';

import { db } from '@hominem/db';
import type { Database } from '@hominem/db';

import type { ChatOutput } from '../contracts';
import type { CreateChatParams } from './chat.types';

type ChatRow = Selectable<Database['chat']>;

function toChatOutput(row: ChatRow): ChatOutput {
  return {
    id: row.id,
    title: row.title,
    userId: row.user_id,
    noteId: row.note_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createChatQuery(params: CreateChatParams): Promise<ChatOutput> {
  const chatId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newChat = await db
    .insertInto('chat')
    .values({
      id: chatId,
      title: params.title,
      user_id: params.userId,
      note_id: params.noteId ?? null,
      created_at: now,
      updated_at: now,
    })
    .returningAll()
    .executeTakeFirst();

  if (!newChat) {
    throw new Error('Failed to create chat');
  }

  return toChatOutput(newChat);
}

export async function getChatByIdQuery(chatId: string, userId: string): Promise<ChatOutput | null> {
  const chatData = await db
    .selectFrom('chat')
    .selectAll()
    .where('id', '=', chatId)
    .where('user_id', '=', userId)
    .limit(1)
    .executeTakeFirst();

  return chatData ? toChatOutput(chatData) : null;
}

export async function getOrCreateActiveChatQuery(
  userId: string,
  chatId?: string,
): Promise<ChatOutput> {
  if (chatId) {
    const existingChat = await db
      .selectFrom('chat')
      .selectAll()
      .where('id', '=', chatId)
      .where('user_id', '=', userId)
      .limit(1)
      .executeTakeFirst();

    if (existingChat) {
      return toChatOutput(existingChat);
    }
  }

  const newChat = await db
    .insertInto('chat')
    .values({
      id: crypto.randomUUID(),
      title: 'New Chat',
      user_id: userId,
      note_id: null,
    })
    .returningAll()
    .executeTakeFirst();

  if (!newChat) {
    throw new Error('Failed to create chat');
  }

  return toChatOutput(newChat);
}

export async function getUserChatsQuery(userId: string, limit = 50): Promise<ChatOutput[]> {
  const chats = await db
    .selectFrom('chat')
    .selectAll()
    .where('user_id', '=', userId)
    .orderBy('updated_at', 'desc')
    .limit(limit)
    .execute();

  return chats.map(toChatOutput);
}

export async function getChatByNoteIdQuery(
  noteId: string,
  userId: string,
): Promise<ChatOutput | null> {
  const chatData = await db
    .selectFrom('chat')
    .selectAll()
    .where('note_id', '=', noteId)
    .where('user_id', '=', userId)
    .limit(1)
    .executeTakeFirst();

  return chatData ? toChatOutput(chatData) : null;
}

export async function updateChatTitleQuery(
  chatId: string,
  title: string,
  userId: string,
): Promise<ChatOutput | null> {
  const updatedChat = await db
    .updateTable('chat')
    .set({
      title: title,
      updated_at: new Date().toISOString(),
    })
    .where('id', '=', chatId)
    .where('user_id', '=', userId)
    .returningAll()
    .executeTakeFirst();

  return updatedChat ? toChatOutput(updatedChat) : null;
}

export async function deleteChatQuery(chatId: string, userId: string): Promise<boolean> {
  const existingChat = await db
    .selectFrom('chat')
    .select('id')
    .where('id', '=', chatId)
    .where('user_id', '=', userId)
    .limit(1)
    .executeTakeFirst();

  if (!existingChat) {
    return false;
  }

  await db.deleteFrom('chat_message').where('chat_id', '=', chatId).execute();
  await db
    .deleteFrom('chat')
    .where('id', '=', chatId)
    .where('user_id', '=', userId)
    .execute();
  return true;
}

export async function clearChatMessagesQuery(chatId: string, userId: string): Promise<boolean> {
  const existingChat = await db
    .selectFrom('chat')
    .select('id')
    .where('id', '=', chatId)
    .where('user_id', '=', userId)
    .limit(1)
    .executeTakeFirst();

  if (!existingChat) {
    return false;
  }

  await db.deleteFrom('chat_message').where('chat_id', '=', chatId).execute();
  return true;
}
