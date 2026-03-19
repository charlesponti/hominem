import type { Chat } from '@hominem/hono-rpc/types';

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface ChatWithActivity extends Chat {
  activityAt: string;
}

export function getChatActivityAt(chat: Chat): string {
  return chat.updatedAt ?? chat.createdAt;
}

export function isChatResumable(chat: Chat, now = Date.now()): boolean {
  return now - new Date(getChatActivityAt(chat)).getTime() <= THIRTY_DAYS_MS;
}

export function toChatsWithActivity(chats: Chat[], now = Date.now()): ChatWithActivity[] {
  return chats
    .map((chat) => ({
      ...chat,
      activityAt: getChatActivityAt(chat),
    }))
    .filter((chat) => isChatResumable(chat, now))
    .sort((a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime());
}

export function getInboxChatsWithActivity(chats: Chat[], now = Date.now()): ChatWithActivity[] {
  return toChatsWithActivity(chats, now).filter((chat) => !chat.archivedAt)
}

export function getArchivedChatsWithActivity(chats: Chat[], now = Date.now()): ChatWithActivity[] {
  return toChatsWithActivity(chats, now).filter((chat) => Boolean(chat.archivedAt))
}

export function selectSherpaChat(chats: Chat[], requestedChatId?: string | null): Chat | null {
  if (requestedChatId) {
    return chats.find((chat) => chat.id === requestedChatId) ?? null;
  }

  return chats.find((chat) => !chat.archivedAt) ?? null;
}
