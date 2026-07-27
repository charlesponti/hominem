import type { InboxOutput, InboxStreamItem } from '@hominem/rpc/types';
import type { InfiniteData, QueryClient } from '@tanstack/react-query';

import type { InboxStreamItemData } from '~/components/inbox/InboxStreamItem.types';
import { getContentRoute } from '~/services/navigation/routes';
import { inboxKeys } from '~/services/notes/query-keys';

type InboxPageIndex = Omit<InboxOutput, 'items'> & { itemIds: string[] };
export type InboxEntityMap = Record<string, InboxStreamItemData>;

export const inboxEntityKeys = {
  all: ['inbox', 'entities'] as const,
};

function getId(item: Pick<InboxStreamItem, 'kind' | 'id'>) {
  return `${item.kind}:${item.id}`;
}

function toEntity(item: InboxStreamItem): InboxStreamItemData {
  return {
    ...item,
    id: getId(item),
    route: getContentRoute(item.kind, item.entityId),
  };
}

export function indexInboxPage(queryClient: QueryClient, page: InboxOutput): InboxPageIndex {
  queryClient.setQueryData<InboxEntityMap>(inboxEntityKeys.all, (current) => ({
    ...current,
    ...Object.fromEntries(page.items.map((item) => [getId(item), toEntity(item)])),
  }));

  return { ...page, itemIds: page.items.map(getId) };
}

export function getInboxItems(
  data: InfiniteData<InboxPageIndex, string | null> | undefined,
  entities: InboxEntityMap | undefined,
) {
  return (
    data?.pages.flatMap((page) =>
      page.itemIds
        .map((id) => entities?.[id])
        .filter((item): item is InboxStreamItemData => Boolean(item)),
    ) ?? []
  );
}

export function patchInboxEntity(
  queryClient: QueryClient,
  identity: { kind: InboxStreamItem['kind']; entityId: string },
  patch: Partial<Pick<InboxStreamItemData, 'preview' | 'title' | 'updatedAt'>>,
) {
  queryClient.setQueryData<InboxEntityMap>(inboxEntityKeys.all, (current) => {
    if (!current) return current;
    const id = Object.keys(current).find((key) => {
      const item = current[key];
      return item.kind === identity.kind && item.entityId === identity.entityId;
    });
    return id ? { ...current, [id]: { ...current[id], ...patch } } : current;
  });
}

export function removeInboxEntity(
  queryClient: QueryClient,
  identity: { kind: InboxStreamItem['kind']; entityId: string },
) {
  queryClient.setQueriesData<InfiniteData<InboxPageIndex, string | null>>(
    { queryKey: inboxKeys.pages() },
    (data) =>
      data && {
        ...data,
        pages: data.pages.map((page) => ({
          ...page,
          itemIds: page.itemIds.filter((id) => {
            const item = queryClient.getQueryData<InboxEntityMap>(inboxEntityKeys.all)?.[id];
            return item?.kind !== identity.kind || item.entityId !== identity.entityId;
          }),
        })),
      },
  );
}
