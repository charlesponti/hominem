import { useApiClient } from '@hominem/rpc/react';
import type { Chat, ChatsListOutput } from '@hominem/rpc/types';
import { useQuery } from '@tanstack/react-query';

import { chatKeys } from '../notes/query-keys';
import { CHAT_LIST_STALE_TIME_MS } from './chat-lists';

async function fetchChats(
  client: ReturnType<typeof useApiClient>,
  options: { cursor?: string | null; limit: number },
): Promise<ChatsListOutput> {
  const response = await client.api.chats.$get({
    query: { cursor: options.cursor ?? undefined, limit: String(options.limit) },
  });
  return response.json();
}

export function useLatestChat() {
  const client = useApiClient();

  return useQuery<Chat | null, Error>({
    queryKey: chatKeys.latest,
    staleTime: CHAT_LIST_STALE_TIME_MS,
    queryFn: async () => (await fetchChats(client, { limit: 1 })).items[0] ?? null,
  });
}
