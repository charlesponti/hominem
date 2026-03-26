import type { Chat } from '@hominem/rpc/types';

export {
  getArchivedChatsWithActivity,
  getChatActivityAt,
  getInboxChatsWithActivity,
  isChatResumable,
  selectChatSession,
  toChatsWithActivity,
} from '@hominem/chat-services';

export type { ChatSessionLike } from '@hominem/chat-services';

export type ChatWithActivity = Chat & {
  activityAt: string;
};
