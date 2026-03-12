export const focusKeys = {
  all: ['focusItems'] as const,
  list: () => [...focusKeys.all, 'list'] as const,
  detail: (id: string) => [...focusKeys.all, 'detail', id] as const,
} as const;
