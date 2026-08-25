import { parseInboxTimestamp } from '@hominem/chat';
import type { Chat } from '@hominem/rpc/types';
import { TIME_UNITS } from '@hominem/utils/time';

import { getChatActivityAt } from './chat-activity';
import type { ChatWithActivity } from './chat-types';

function parseChatActivityAt(chat: Chat): Date {
  return parseInboxTimestamp(getChatActivityAt(chat));
}

function isChatResumable(chat: Chat, now = Date.now()): boolean {
  return now - parseChatActivityAt(chat).getTime() <= TIME_UNITS.MONTH;
}

function toChatsWithActivity(chats: Chat[], now = Date.now()): ChatWithActivity[] {
  return chats
    .reduce<ChatWithActivity[]>((resumable, chat) => {
      const chatWithActivity = { ...chat, activityAt: getChatActivityAt(chat) };
      if (isChatResumable(chatWithActivity, now)) resumable.push(chatWithActivity);
      return resumable;
    }, [])
    .sort(
      (a, b) =>
        parseInboxTimestamp(b.activityAt).getTime() - parseInboxTimestamp(a.activityAt).getTime(),
    );
}

export function getArchivedChatsWithActivity(chats: Chat[], now = Date.now()): ChatWithActivity[] {
  return toChatsWithActivity(chats, now).filter((chat) => Boolean(chat.archivedAt));
}
