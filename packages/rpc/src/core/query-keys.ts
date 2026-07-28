/**
 * Shared query key factory for React Query.
 *
 * Single source of truth consumed by both web and mobile.
 * Keys follow the pattern: [domain, operation, ...params]
 *
 */

export const queryKeys = {
  inbox: {
    all: ['inbox'] as const,
    pages: () => ['inbox', 'pages'] as const,
    page: (options: Record<string, unknown>) => ['inbox', 'pages', options] as const,
  },

  notes: {
    all: ['notes'] as const,
    lists: () => ['notes', 'list'] as const,
    feeds: () => ['notes', 'feed'] as const,
    list: (options: Record<string, unknown>) => ['notes', 'list', options] as const,
    feed: (options: Record<string, unknown>) => ['notes', 'feed', options] as const,
    detail: (id: string) => ['notes', 'detail', id] as const,
    search: (query: string) => ['notes', 'search', query] as const,
  },

  chats: {
    all: ['chats'] as const,
    list: ['chats', 'list'] as const,
    detail: (chatId: string) => ['chats', 'detail', chatId] as const,
    messages: (chatId: string, limit = 50) => ['chats', 'messages', { chatId, limit }] as const,
    sessions: ['chats', 'sessions'] as const,
    archived: ['chats', 'archived'] as const,
  },

  files: {
    all: ['files'] as const,
    list: ['files', 'list'] as const,
    detail: (fileId: string) => ['files', 'detail', fileId] as const,
  },

  tasks: {
    all: ['tasks'] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
  },

  usage: {
    monthly: ['usage', 'monthly'] as const,
  },
} as const;

export type QueryKeys = typeof queryKeys;
