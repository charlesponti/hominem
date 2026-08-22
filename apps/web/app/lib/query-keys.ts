import { queryKeys } from '@hominem/rpc/react';
/**
 * Re-export the shared query key factory from @hominem/rpc.
 *
 * This replaces the local key definitions that were diverging
 * from mobile. Both apps now share a single source of truth.
 */
import type { QueryClient } from '@tanstack/react-query';

export const DEFAULT_NOTES_FEED_LIMIT = 20;

export const chatQueryKeys = {
  list: queryKeys.chats.list,
  get: (chatId: string) => queryKeys.chats.detail(chatId),
  messages: (chatId: string) => queryKeys.chats.messages(chatId),
  note: (noteId: string) => ['chats', 'note', noteId] as const,
  sidebarList: ['chats', 'sidebar', 'list'] as const,
};

export const placeListsQueryKeys = {
  pendingInvites: queryKeys.placeLists.pendingInvites,
};

export const notesQueryKeys = {
  lists: queryKeys.notes.lists,
  feeds: queryKeys.notes.feeds,
  list: (options: Record<string, unknown>) => queryKeys.notes.list(options),
  feed: (options: Record<string, unknown>) => queryKeys.notes.feed(options),
  detail: (id: string) => queryKeys.notes.detail(id),
  search: (query: string) => queryKeys.notes.search(query),
};

export async function createNotesMutationSuccessHandler(
  queryClient: QueryClient,
  updatedNoteId?: string,
): Promise<void> {
  const invalidations: Promise<void>[] = [
    queryClient.invalidateQueries({ queryKey: notesQueryKeys.lists() }),
    queryClient.invalidateQueries({ queryKey: notesQueryKeys.feeds() }),
  ];

  if (updatedNoteId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: notesQueryKeys.detail(updatedNoteId) }),
    );
  }

  await Promise.all(invalidations);
}
