import { db, takeUniqueOrThrow } from '@hominem/db';
import { chat, chatMessage, type ChatOutput } from '@hominem/db/schema';
import { and, desc, eq } from 'drizzle-orm';
import type { CreateChatParams } from './chat.types';

export async function createChatQuery(params: CreateChatParams): Promise<ChatOutput> {
  const chatId = crypto.randomUUID();
  const now = new Date().toISOString();

  const [newChat]: ChatOutput[] = await db
    .insert(chat)
    .values({
      id: chatId,
      title: params.title,
      userId: params.userId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return newChat;
}

export async function getChatByIdQuery(chatId: string, userId: string): Promise<ChatOutput | null> {
  const [chatData]: (ChatOutput | undefined)[] = await db
    .select()
    .from(chat)
    .where(and(eq(chat.id, chatId), eq(chat.userId, userId)))
    .limit(1);

  return chatData;
}

export async function getOrCreateActiveChatQuery(
  userId: string,
  chatId?: string,
): Promise<ChatOutput> {
  if (chatId) {
    const existingChat: ChatOutput | null = await db
      .select()
      .from(chat)
      .where(eq(chat.id, chatId))
      .limit(1)
      .then(takeUniqueOrThrow)
      .catch(() => null);

    if (existingChat) {
      return existingChat;
    }
  }

  const newChat: ChatOutput = await db
    .insert(chat)
    .values({
      id: crypto.randomUUID(),
      title: 'New Chat',
      userId: userId,
    })
    .returning()
    .then(takeUniqueOrThrow);

  return newChat;
}

export async function getUserChatsQuery(userId: string, limit = 50): Promise<ChatOutput[]> {
  const chats: ChatOutput[] = await db
    .select()
    .from(chat)
    .where(eq(chat.userId, userId))
    .orderBy(desc(chat.updatedAt))
    .limit(limit);

  return chats;
}

export async function updateChatTitleQuery(
  chatId: string,
  title: string,
): Promise<ChatOutput | undefined> {
  const [updatedChat]: (ChatOutput | undefined)[] = await db
    .update(chat)
    .set({
      title: title,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(chat.id, chatId))
    .returning();

  return updatedChat;
}

export async function deleteChatQuery(chatId: string): Promise<void> {
  await db.delete(chatMessage).where(eq(chatMessage.chatId, chatId));
  await db.delete(chat).where(eq(chat.id, chatId));
}

export async function clearChatMessagesQuery(chatId: string): Promise<void> {
  await db.delete(chatMessage).where(eq(chatMessage.chatId, chatId));
}