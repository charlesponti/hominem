import type { HonoClient } from '@hominem/hono-client';
import type { EventsListOutput } from '@hominem/hono-rpc/types/events.types';

import { useHonoQuery } from '@hominem/hono-client/react';

export function useEventsList(options: { limit?: number } = {}) {
  const queryParams: Record<string, string> = {};

  if (options.limit) {
    queryParams.limit = String(options.limit);
  }

  return useHonoQuery<EventsListOutput>(
    ['events', 'list', options],
    async (client: HonoClient) => {
      const res = await client.api.events.$get({
        query: queryParams,
      });
      return res.json();
    },
    {
      staleTime: 1000 * 60 * 2, // 2 minutes
      refetchOnWindowFocus: false,
    },
  );
}
