import type { Chat } from '@hominem/rpc/types';
import { TIME_UNITS } from '@hominem/utils';

import { parseInboxTimestamp } from '~/utils/date/parse-inbox-timestamp';

export interface ChatWithActivity extends Chat {
  activityAt: string;
}

export function getChatActivityAt(chat: Chat): string {
  return chat.updatedAt ?? chat.createdAt;
}

function parseChatActivityAt(chat: Chat): Date {
  return parseInboxTimestamp(getChatActivityAt(chat));
}

export function isChatResumable(chat: Chat, now = Date.now()): boolean {
  return now - parseChatActivityAt(chat).getTime() <= TIME_UNITS.MONTH;
}

export function toChatsWithActivity(chats: Chat[], now = Date.now()): ChatWithActivity[] {
  return chats
    .map((chat) => ({
      ...chat,
      activityAt: getChatActivityAt(chat),
    }))
    .filter((chat) => isChatResumable(chat, now))
    .sort(
      (a, b) =>
        parseInboxTimestamp(b.activityAt).getTime() - parseInboxTimestamp(a.activityAt).getTime(),
    );
}

export function getInboxChatsWithActivity(chats: Chat[], now = Date.now()): ChatWithActivity[] {
  return toChatsWithActivity(chats, now).filter((chat) => !chat.archivedAt);
}

export function getArchivedChatsWithActivity(chats: Chat[], now = Date.now()): ChatWithActivity[] {
  return toChatsWithActivity(chats, now).filter((chat) => Boolean(chat.archivedAt));
}

export function selectChatSession(chats: Chat[], requestedChatId?: string | null): Chat | null {
  if (requestedChatId) {
    return chats.find((chat) => chat.id === requestedChatId) ?? null;
  }

  return chats.find((chat) => !chat.archivedAt) ?? null;
}
