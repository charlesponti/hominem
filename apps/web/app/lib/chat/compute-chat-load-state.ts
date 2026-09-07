export type ChatLoadState =
  | { kind: 'not-found' }
  | { kind: 'error' }
  | { kind: 'initial' }
  | { kind: 'ready'; isRestoring: boolean };

/**
 * Separates "no data yet" (initial) from "data on screen, background
 * refetch in flight" (restored/restoring) so a resumed chat never shows the
 * same blocking loading state as a brand-new one. Active-generation state is
 * tracked independently (streamMessage/regeneration) and isn't folded in
 * here.
 */
export function computeChatLoadState({
  messagesStatus,
  isNotFound,
  hasError,
  isLoading,
  isFetching,
  messageCount,
}: {
  messagesStatus: number;
  isNotFound: boolean;
  hasError: boolean;
  isLoading: boolean;
  isFetching: boolean;
  messageCount: number;
}): ChatLoadState {
  if (messagesStatus === 404 || isNotFound) return { kind: 'not-found' };
  if (hasError) return { kind: 'error' };
  if (isLoading || (isFetching && messageCount === 0)) return { kind: 'initial' };
  return { kind: 'ready', isRestoring: isFetching && messageCount > 0 };
}
