import type {
  EventsGoogleCalendarsOutput,
  EventsGoogleSyncOutput,
  EventsGoogleSyncInput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation, useHonoClient, useHonoUtils } from '@hominem/hono-client/react';
import { useCallback, useState } from 'react';

export interface CalendarSyncOptions {
  calendarId?: string | undefined;
  timeMin?: string | undefined;
  timeMax?: string | undefined;
}

export function useGoogleCalendarSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncResult, setSyncResult] = useState<EventsGoogleSyncOutput | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const syncMutation = useHonoMutation<EventsGoogleSyncOutput, EventsGoogleSyncInput>(
    async (client, variables) => {
      const res = await client.api.events.google.sync.$post({ json: variables });
      return res.json();
    },
  );

  const syncCalendar = async (options: CalendarSyncOptions) => {
    setIsLoading(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const result = await syncMutation.mutateAsync({
        calendarId: options.calendarId,
        timeMin: options.timeMin,
        timeMax: options.timeMax,
      });

      setSyncResult(result);
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const client = useHonoClient();
  const utils = useHonoUtils();

  const getCalendars = useCallback(async () => {
    // Try cache first
    const cached = utils.getData<EventsGoogleCalendarsOutput>(['events', 'google', 'calendars']);
    if (cached) return cached;

    const res = await client.api.events.google.calendars.$get();
    const json = await res.json();

    // seed cache
    utils.setData(['events', 'google', 'calendars'], json);
    return json;
  }, [client, utils]);

  return {
    syncCalendar,
    getCalendars,
    isLoading: isLoading || syncMutation.isPending,
    syncResult,
    syncError,
  };
}
