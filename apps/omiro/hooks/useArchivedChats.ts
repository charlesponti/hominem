import { useApiClient } from '@hominem/rpc/react';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';

import { getArchivedChatsWithActivity } from '~/services/chat/chat-lists';
import type { ChatWithActivity } from '~/services/chat/chat-types';
import { chatKeys } from '~/services/notes/query-keys';

interface UseArchivedChatsOptions {
  enabled?: boolean;
}

const ARCHIVED_CHATS_STALE_TIME_MS = 5 * 60_000;

export const useArchivedChats = ({ enabled = true }: UseArchivedChatsOptions = {}) => {
  const client = useApiClient();
  const queryClient = useQueryClient();

  const archivedIndex = useQuery<string[]>({
    queryKey: chatKeys.archivedChats,
    queryFn: async () => {
      const res = await client.api.chats.$get({ query: { limit: '100' } });
      const chats = await res.json();
      const archivedChats = getArchivedChatsWithActivity(chats);
      archivedChats.forEach((chat) => queryClient.setQueryData(chatKeys.detail(chat.id), chat));
      return archivedChats.map((chat) => chat.id);
    },
    enabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ARCHIVED_CHATS_STALE_TIME_MS,
  });

  const chatQueries = useQueries({
    queries: (archivedIndex.data ?? []).map((chatId) => ({
      enabled: false,
      queryKey: chatKeys.detail(chatId),
      queryFn: () => queryClient.getQueryData<ChatWithActivity>(chatKeys.detail(chatId)),
    })),
  });
  const chats = (archivedIndex.data ?? []).flatMap((chatId, index) => {
    const chat = chatQueries[index]?.data as ChatWithActivity | undefined;
    return chat ? [chat] : [];
  });

  return {
    ...archivedIndex,
    data: chats,
  };
};
