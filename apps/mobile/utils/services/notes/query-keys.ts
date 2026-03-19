export const focusKeys = {
  all: ['focusItems'] as const,
  list: () => [...focusKeys.all, 'list'] as const,
  detail: (id: string) => [...focusKeys.all, 'detail', id] as const,
} as const

export const chatKeys = {
  resumableSessions: ['resumableSessions'] as const,
  archivedSessions: ['archivedSessions'] as const,
  messages: (chatId: string) => ['chatMessages', chatId] as const,
  activeChat: (chatId: string | null) => ['activeChat', chatId] as const,
} as const
