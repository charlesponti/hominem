import type { Chat, ChatMessage } from '~/utils/local-store/types';

export const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export interface ChatWithActivity extends Chat {
  activityAt: string;
}

export function getChatActivityAt(chat: Chat, messages: ChatMessage[]): string {
  const lastMessage = messages[messages.length - 1];
  return lastMessage?.createdAt ?? chat.createdAt;
}

export function isChatResumable(chat: Chat, messages: ChatMessage[], now = Date.now()): boolean {
  return now - new Date(getChatActivityAt(chat, messages)).getTime() <= THIRTY_DAYS_MS;
}

export function toChatsWithActivity(
  chats: Chat[],
  messagesByChatId: Record<string, ChatMessage[]>,
  now = Date.now(),
): ChatWithActivity[] {
  return chats
    .map((chat) => ({
      ...chat,
      activityAt: getChatActivityAt(chat, messagesByChatId[chat.id] ?? []),
    }))
    .filter((chat) => isChatResumable(chat, messagesByChatId[chat.id] ?? [], now))
    .sort((a, b) => new Date(b.activityAt).getTime() - new Date(a.activityAt).getTime());
}

export function selectSherpaChat(chats: Chat[], requestedChatId?: string | null): Chat | null {
  if (requestedChatId) {
    return chats.find((chat) => chat.id === requestedChatId) ?? null;
  }

  return chats.find((chat) => !chat.endedAt) ?? null;
}
