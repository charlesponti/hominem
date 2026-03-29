import crypto from 'node:crypto';

import { db } from '@hominem/db';
import type { Database } from '@hominem/db';
import type { Selectable } from 'kysely';

import type { ChatOutput } from '../contracts';
import type { CreateChatParams } from './chat.types';

type ChatRow = Selectable<Database['app.chats']>;

function toIsoString(value: Date | string | null | undefined): string {
  if (value === null || value === undefined) {
    return new Date().toISOString();
  }

  return value instanceof Date ? value.toISOString() : value;
}

function toChatOutput(row: ChatRow): ChatOutput {
  return {
    archivedAt: null,
    id: row.id,
    title: row.title,
    userId: row.owner_userid,
    noteId: row.note_id ?? null,
    createdAt: toIsoString(row.createdat),
    updatedAt: toIsoString(row.updatedat),
  };
}

export async function createChatQuery(params: CreateChatParams): Promise<ChatOutput> {
  const chatId = crypto.randomUUID();
  const now = new Date();

  const newChat = await db
    .insertInto('app.chats')
    .values({
      id: chatId,
      title: params.title,
      owner_userid: params.userId,
      note_id: params.noteId ?? null,
      createdat: now,
      updatedat: now,
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
    .selectFrom('app.chats')
    .selectAll()
    .where('id', '=', chatId)
    .where('owner_userid', '=', userId)
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
      .selectFrom('app.chats')
      .selectAll()
      .where('id', '=', chatId)
      .where('owner_userid', '=', userId)
      .limit(1)
      .executeTakeFirst();

    if (existingChat) {
      return toChatOutput(existingChat);
    }
  }

  const newChat = await db
    .insertInto('app.chats')
    .values({
      id: crypto.randomUUID(),
      title: 'New Chat',
      owner_userid: userId,
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
    .selectFrom('app.chats')
    .selectAll()
    .where('owner_userid', '=', userId)
    .orderBy('updatedat', 'desc')
    .limit(limit)
    .execute();

  return chats.map(toChatOutput);
}

export async function getChatByNoteIdQuery(
  noteId: string,
  userId: string,
): Promise<ChatOutput | null> {
  const chatData = await db
    .selectFrom('app.chats')
    .selectAll()
    .where('note_id', '=', noteId)
    .where('owner_userid', '=', userId)
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
    .updateTable('app.chats')
    .set({
      title: title,
      updatedat: new Date(),
    })
    .where('id', '=', chatId)
    .where('owner_userid', '=', userId)
    .returningAll()
    .executeTakeFirst();

  return updatedChat ? toChatOutput(updatedChat) : null;
}

export async function archiveChatQuery(chatId: string, userId: string): Promise<ChatOutput | null> {
  const timestamp = new Date();
  const archivedChat = await db
    .updateTable('app.chats')
    .set({
      updatedat: timestamp,
    })
    .where('id', '=', chatId)
    .where('owner_userid', '=', userId)
    .returningAll()
    .executeTakeFirst();

  if (!archivedChat) {
    return null;
  }

  return {
    ...toChatOutput(archivedChat),
    archivedAt: timestamp.toISOString(),
  };
}

export async function deleteChatQuery(chatId: string, userId: string): Promise<boolean> {
  const existingChat = await db
    .selectFrom('app.chats')
    .select('id')
    .where('id', '=', chatId)
    .where('owner_userid', '=', userId)
    .limit(1)
    .executeTakeFirst();

  if (!existingChat) {
    return false;
  }

  await db.deleteFrom('app.chat_messages').where('chat_id', '=', chatId).execute();
  await db
    .deleteFrom('app.chats')
    .where('id', '=', chatId)
    .where('owner_userid', '=', userId)
    .execute();
  return true;
}

export async function clearChatMessagesQuery(chatId: string, userId: string): Promise<boolean> {
  const existingChat = await db
    .selectFrom('app.chats')
    .select('id')
    .where('id', '=', chatId)
    .where('owner_userid', '=', userId)
    .limit(1)
    .executeTakeFirst();

  if (!existingChat) {
    return false;
  }

  await db.deleteFrom('app.chat_messages').where('chat_id', '=', chatId).execute();
  return true;
}
