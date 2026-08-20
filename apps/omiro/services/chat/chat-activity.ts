import type { Chat } from '@hominem/rpc/types';

export function getChatActivityAt(chat: Chat): string {
  return chat.updatedAt ?? chat.createdAt;
}
