/**
 * Re-export the shared query key factory from @hominem/rpc.
 *
 * This replaces the local key definitions that were diverging
 * from web. Both apps now share a single source of truth.
 */
import { queryKeys } from '@hominem/rpc/react';

export const inboxKeys = {
  pages: queryKeys.inbox.pages,
  page: (options: Record<string, unknown>) => queryKeys.inbox.page(options),
} as const;

export const noteKeys = {
  detail: (id: string) => queryKeys.notes.detail(id),
} as const;

export const chatKeys = {
  resumableChats: queryKeys.chats.sessions,
  archivedChats: queryKeys.chats.archived,
  messages: (chatId: string) => queryKeys.chats.messages(chatId),
  messageSearch: (chatId: string, query: string) => queryKeys.chats.messageSearch(chatId, query),
  detail: (chatId: string) => ['chats', 'detail', chatId] as const,
  activeChat: (chatId: string | null) => ['chats', 'detail', chatId] as const,
} as const;
