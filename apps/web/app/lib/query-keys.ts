/**
 * Centralized React Query key factories for the web app.
 * Mirrors the pattern in apps/mobile/utils/services/notes/query-keys.ts.
 */

const MESSAGES_LIMIT = 50;

export const chatQueryKeys = {
  get: (chatId: string) => ['chats', chatId] as const,
  messages: (chatId: string) =>
    ['chats', 'getMessages', { chatId, limit: MESSAGES_LIMIT }] as const,
  note: (noteId: string) => ['chats', 'note', noteId] as const,
  sidebarList: ['chats', 'sidebar', 'list'] as const,
};

export const notesQueryKeys = {
  list: (options: Record<string, unknown> = {}) => ['notes', 'list', options] as const,
  detail: (id: string) => ['notes', id] as const,
};

export const focusQueryKeys = {
  all: ['focus'] as const,
};
