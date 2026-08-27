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
  list: queryKeys.chats.list,
  latest: [...queryKeys.chats.list, 'latest'] as const,
  page: (options: { cursor?: string | null; includeArchived?: boolean; limit: number }) =>
    queryKeys.chats.page(options),
  resumableChats: queryKeys.chats.sessions,
  archivedChats: queryKeys.chats.archived,
  messages: (chatId: string) => queryKeys.chats.messages(chatId),
  messageSearch: (chatId: string, query: string) => queryKeys.chats.messageSearch(chatId, query),
  detail: queryKeys.chats.detail,
  activeChat: (chatId: string | null) =>
    chatId === null ? (['chats', 'detail', null] as const) : queryKeys.chats.detail(chatId),
  sources: (chatId: string) => ['chats', 'sources', chatId] as const,
} as const;
