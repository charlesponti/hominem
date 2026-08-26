import { queryKeys } from '@hominem/rpc/react';
/**
 * Re-export the shared query key factory from @hominem/rpc.
 *
 * This replaces the local key definitions that were diverging
 * from mobile. Both apps now share a single source of truth.
 */

export const chatQueryKeys = {
  list: queryKeys.chats.list,
  get: (chatId: string) => queryKeys.chats.detail(chatId),
  messages: (chatId: string) => queryKeys.chats.messages(chatId),
  note: (noteId: string) => ['chats', 'note', noteId] as const,
  sidebarList: ['chats', 'sidebar', 'list'] as const,
  sources: (chatId: string) => ['chats', 'sources', chatId] as const,
};

export const notesQueryKeys = {
  search: (query: string) => queryKeys.notes.search(query),
};
