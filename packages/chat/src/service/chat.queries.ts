import type { ChatOutput } from '@hominem/db/types/chats';

import { db, takeUniqueOrThrow } from '@hominem/db';
import { chat, chatMessage } from '@hominem/db/schema/chats';
import { and, desc, eq } from 'drizzle-orm';

import type { CreateChatParams } from './chat.types';

export async function createChatQuery(params: CreateChatParams): Promise<ChatOutput> {
  const chatId = crypto.randomUUID();
  const now = new Date().toISOString();

  const [newChat] = await db
    .insert(chat)
    .values({
      id: chatId,
      title: params.title,
      userId: params.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return newChat as ChatOutput;
}

export async function getChatByIdQuery(chatId: string, userId: string): Promise<ChatOutput | null> {
  const [chatData] = await db
    .select()
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
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
      .from(chat)
      .where(eq(chat.id, chatId))
      .limit(1)
      .then(takeUniqueOrThrow)
      .catch(() => null);

    if (existingChat) {
      return existingChat as ChatOutput;
    }
  }

  const newChat = await db
    .insert(chat)
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
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.updatedAt))
    .limit(limit);

  return chats as ChatOutput[];
}

export async function updateChatTitleQuery(
  chatId: string,
  title: string,
): Promise<ChatOutput | null> {
  const [updatedChat] = await db
    .update(chat)
    .set({
      title: title,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chat.id, chatId))
    .returning();

  return updatedChat ?? null;
}

export async function deleteChatQuery(chatId: string): Promise<void> {
  await db.delete(chatMessage).where(eq(chatMessage.chatId, chatId));
  await db.delete(chat).where(eq(chat.id, chatId));
}

export async function clearChatMessagesQuery(chatId: string): Promise<void> {
  await db.delete(chatMessage).where(eq(chatMessage.chatId, chatId));
}
