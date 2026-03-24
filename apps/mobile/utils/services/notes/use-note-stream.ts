import { useApiClient } from '@hominem/rpc/react';
import { useQuery } from '@tanstack/react-query';

import type { InboxStreamItem } from '~/components/workspace/inbox-stream-items';

import { noteKeys } from './query-keys';

function toRoute(kind: 'note' | 'chat', id: string): string {
  return kind === 'note'
    ? `/(protected)/(tabs)/focus/${id}`
    : `/(protected)/(tabs)/sherpa?chatId=${id}`;
}

export function useNoteStream({ enabled = true }: { enabled?: boolean } = {}) {
  const client = useApiClient();

  return useQuery<InboxStreamItem[]>({
    queryKey: noteKeys.all,
    queryFn: async () => {
      const { items } = await client.focus.list();
      return items.map((item) => ({
        ...item,
        route: toRoute(item.kind, item.id),
      }));
    },
    initialData: [],
    enabled,
  });
}
