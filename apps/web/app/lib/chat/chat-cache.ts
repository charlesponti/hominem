import type { QueryClient } from '@tanstack/react-query';

import { chatQueryKeys } from '../query-keys';

export function invalidateChatQueries(queryClient: QueryClient, chatId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.get(chatId) }),
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.messages(chatId) }),
    queryClient.invalidateQueries({ queryKey: chatQueryKeys.list }),
  ]);
}
