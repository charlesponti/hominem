import type { EventsGoogleCalendarsOutput } from '@hominem/hono-rpc/types';
import type { ApiResult } from '@hominem/services';

import { useHonoMutation, useHonoClient, useHonoUtils } from '@hominem/hono-client/react';
import { useCallback, useState } from 'react';

export interface CalendarSyncOptions {
  calendarId?: string;
  timeMin?: string;
  timeMax?: string;
}

export interface CalendarSyncResult {
  success: boolean;
  syncedEvents: number;
  totalEvents: number;
  events: unknown[];
  error?: string;
}

export function useGoogleCalendarSync() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CalendarSyncResult | null>(null);

  const syncMutation = useHonoMutation(async (client, variables: CalendarSyncOptions) => {
    const res = await client.api.events.google.sync.$post({ json: variables });
    return res.json();
  });

  const syncCalendar = async (options: CalendarSyncOptions) => {
    setIsLoading(true);
    setResult(null);

    try {
       const syncResult = await syncMutation.mutateAsync({
         calendarId: options.calendarId,
         timeMin: options.timeMin,
         timeMax: options.timeMax,
       });

       setResult({
         success: true,
         syncedEvents: syncResult.syncedEvents ?? syncResult.eventCount ?? 0,
         totalEvents: syncResult.eventCount ?? 0,
         events: [],
         error: undefined,
       });
     } catch (error) {
      setResult({
        success: false,
        syncedEvents: 0,
        totalEvents: 0,
        events: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      });
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
    result,
  };
}
