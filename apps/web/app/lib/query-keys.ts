import { queryKeys } from '@hominem/rpc/react';
// re-exports the shared query key factory from @hominem/rpc so web and
// mobile stay on the same keys instead of drifting apart

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
