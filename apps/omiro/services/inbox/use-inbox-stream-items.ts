import { useApiClient } from '@hominem/rpc/react';
import type { InboxOutput } from '@hominem/rpc/types';
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';
import { useMemo } from 'react';

import { inboxKeys } from '~/services/notes/query-keys';
import {
  hasNonEmptyListData,
  resolveRestoredQueryState,
} from '~/services/query/restored-query-state';

import {
  getInboxItems,
  inboxEntityKeys,
  indexInboxPage,
  type InboxEntityMap,
} from './inbox-entities';

interface UseInboxStreamItemsOptions {
  enabled?: boolean;
}

const INBOX_STREAM_STALE_TIME_MS = 30_000;

export function useInboxStreamItems({ enabled = true }: UseInboxStreamItemsOptions = {}) {
  const client = useApiClient();
  const queryClient = useQueryClient();

  const inboxQuery = useInfiniteQuery<
    Omit<InboxOutput, 'items'> & { itemIds: string[] },
    Error,
    InfiniteData<Omit<InboxOutput, 'items'> & { itemIds: string[] }, string | null>,
    readonly unknown[],
    string | null
  >({
    queryKey: inboxKeys.page({ limit: 50 }),
    initialPageParam: null,
    queryFn: async ({ pageParam }) => {
      const query: { limit: string; cursor?: string } = { limit: '50' };
      if (pageParam) query.cursor = pageParam;
      const res = await client.api.inbox.$get({ query });
      const page = (await res.json()) as InboxOutput;
      return indexInboxPage(queryClient, page);
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: INBOX_STREAM_STALE_TIME_MS,
    enabled,
  });

  const { data: entities } = useQuery<InboxEntityMap>({
    queryKey: inboxEntityKeys.all,
    enabled: false,
    queryFn: () => queryClient.getQueryData<InboxEntityMap>(inboxEntityKeys.all) ?? {},
  });
  const items = useMemo(
    () => getInboxItems(inboxQuery.data, entities),
    [entities, inboxQuery.data],
  );
  const restoredState = resolveRestoredQueryState({
    data: items,
    isPending: inboxQuery.isPending,
    isFetching: inboxQuery.isFetching,
    hasUsableData: hasNonEmptyListData,
  });

  return {
    items,
    error: inboxQuery.error,
    isInitialLoading: restoredState.isInitialLoading,
    isRefreshing: restoredState.isRefreshing,
    fetchNextPage: () => inboxQuery.fetchNextPage(),
    hasNextPage: inboxQuery.hasNextPage,
    isFetchingNextPage: inboxQuery.isFetchingNextPage,
    refetch: () => inboxQuery.refetch(),
  };
}
