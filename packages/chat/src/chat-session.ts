import { TIME_UNITS } from '@hominem/utils';
import { parseInboxTimestamp } from '@hominem/utils/dates';

export interface ChatSessionLike {
  id: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export type ChatWithActivity<T extends ChatSessionLike = ChatSessionLike> = T & {
  activityAt: string;
};

export function getChatActivityAt<T extends ChatSessionLike>(chat: T): string {
  return chat.updatedAt ?? chat.createdAt;
}

function parseChatActivityAt<T extends ChatSessionLike>(chat: T): Date {
  return parseInboxTimestamp(getChatActivityAt(chat));
}

export function isChatResumable<T extends ChatSessionLike>(chat: T, now = Date.now()): boolean {
  return now - parseChatActivityAt(chat).getTime() <= TIME_UNITS.MONTH;
}

export function toChatsWithActivity<T extends ChatSessionLike>(
  chats: T[],
  now = Date.now(),
): Array<ChatWithActivity<T>> {
  return chats
    .map((chat) => ({
      ...chat,
      activityAt: getChatActivityAt(chat),
    }))
    .filter((chat) => isChatResumable(chat, now))
    .sort(
      (left, right) =>
        parseInboxTimestamp(right.activityAt).getTime() -
        parseInboxTimestamp(left.activityAt).getTime(),
    );
}

export function getInboxChatsWithActivity<T extends ChatSessionLike>(
  chats: T[],
  now = Date.now(),
): Array<ChatWithActivity<T>> {
  return toChatsWithActivity(chats, now).filter((chat) => !chat.archivedAt);
}

export function getArchivedChatsWithActivity<T extends ChatSessionLike>(
  chats: T[],
  now = Date.now(),
): Array<ChatWithActivity<T>> {
  return toChatsWithActivity(chats, now).filter((chat) => Boolean(chat.archivedAt));
}

export function selectChatSession<T extends ChatSessionLike>(
  chats: T[],
  requestedChatId?: string | null,
): T | null {
  if (requestedChatId) {
    return chats.find((chat) => chat.id === requestedChatId) ?? null;
  }

  return chats.find((chat) => !chat.archivedAt) ?? null;
}
