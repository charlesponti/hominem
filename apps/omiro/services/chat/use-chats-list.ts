import { useApiClient } from '@hominem/rpc/react';
import type { Chat, ChatsListPage } from '@hominem/rpc/types';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { chatKeys } from '../notes/query-keys';
import { CHAT_LIST_STALE_TIME_MS } from './chat-lists';

const CHAT_PAGE_SIZE = 50;

async function fetchChats(
  client: ReturnType<typeof useApiClient>,
  options: { cursor?: string | null; limit: number },
): Promise<ChatsListPage> {
  const response = await client.api.chats.$get({
    query: { cursor: options.cursor ?? undefined, limit: String(options.limit) },
  });
  return response.json();
}

export function useChatsList() {
  const client = useApiClient();

  const query = useInfiniteQuery({
    queryKey: chatKeys.page({ limit: CHAT_PAGE_SIZE }),
    staleTime: CHAT_LIST_STALE_TIME_MS,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => fetchChats(client, { cursor: pageParam, limit: CHAT_PAGE_SIZE }),
    getNextPageParam: (page) => page.nextCursor,
  });

  return { ...query, chats: query.data?.pages.flatMap((page) => page.items) ?? [] };
}

export function useLatestChat() {
  const client = useApiClient();

  return useQuery<Chat | null, Error>({
    queryKey: chatKeys.latest,
    staleTime: CHAT_LIST_STALE_TIME_MS,
    queryFn: async () => (await fetchChats(client, { limit: 1 })).items[0] ?? null,
  });
}
