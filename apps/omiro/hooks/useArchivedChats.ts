import { useApiClient } from '@hominem/rpc/react';
import { useQuery } from '@tanstack/react-query';

import { getArchivedChatsWithActivity } from '~/services/chat/chat-lists';
import type { ChatWithActivity } from '~/services/chat/chat-types';
import { chatKeys } from '~/services/notes/query-keys';

interface UseArchivedChatsOptions {
  enabled?: boolean;
}

const ARCHIVED_CHATS_STALE_TIME_MS = 5 * 60_000;

export const useArchivedChats = ({ enabled = true }: UseArchivedChatsOptions = {}) => {
  const client = useApiClient();

  return useQuery<ChatWithActivity[]>({
    queryKey: chatKeys.archivedChats,
    queryFn: async () => {
      const res = await client.api.chats.$get({ query: { includeArchived: 'true', limit: '100' } });
      const { items: chats } = await res.json();
      return getArchivedChatsWithActivity(chats);
    },
    enabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: ARCHIVED_CHATS_STALE_TIME_MS,
  });
};
