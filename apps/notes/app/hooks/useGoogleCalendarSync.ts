import type { HonoClient } from '@hominem/hono-client';
import type {
  EventsGoogleSyncOutput,
  EventsGoogleSyncInput,
  EventsSyncStatusOutput,
} from '@hominem/hono-rpc/types/events.types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

interface SyncOptions {
  calendarId?: string | undefined;
  timeMin?: string | undefined;
}

export function useGoogleCalendarSync() {
  const utils = useHonoUtils();

  const syncMutation = useHonoMutation<EventsGoogleSyncOutput, EventsGoogleSyncInput>(
    async (client: HonoClient, variables: EventsGoogleSyncInput) => {
      const res = await client.api.events.google.sync.$post({ json: variables });
      return res.json() as Promise<EventsGoogleSyncOutput>;
    },
    {
      onSuccess: () => {
        // Invalidate events list to refresh data
        utils.invalidate(['events', 'list']); // Assuming this key matches use-events
        utils.invalidate(['events', 'sync', 'status']);
      },
    },
  );

  const statusQuery = useHonoQuery<EventsSyncStatusOutput>(
    ['events', 'sync', 'status'],
    async (client: HonoClient) => {
      const res = await client.api.events.sync.status.$get();
      return res.json() as Promise<EventsSyncStatusOutput>;
    },
  );

  const sync = async (options: SyncOptions) => {
    await syncMutation.mutateAsync({
      calendarId: options.calendarId,
      timeMin: options.timeMin,
    });
  };

  const syncStatus = statusQuery.data;

  return {
    sync,
    syncStatus,
    isSyncing: syncMutation.isPending,
    isLoading: statusQuery.isLoading,
    error: syncMutation.error || statusQuery.error,
  };
}
