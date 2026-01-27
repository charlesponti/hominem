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

      if (syncResult?.success) {
        setResult({
          success: true,
          syncedEvents: syncResult.data?.syncedEvents ?? 0,
          totalEvents: syncResult.data?.syncedEvents ?? 0,
          events: [],
          error: undefined,
        });
      } else {
        setResult({
          success: false,
          syncedEvents: 0,
          totalEvents: 0,
          events: [],
          error: syncResult?.message ?? 'Sync failed',
        });
      }
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

    if (json?.success) {
      // seed cache
      utils.setData(['events', 'google', 'calendars'], json);
      return json;
    }

    throw new Error(json?.message ?? 'Failed to fetch Google calendars');
  }, [client, utils]);

  return {
    syncCalendar,
    getCalendars,
    isLoading: isLoading || syncMutation.isPending,
    result,
  };
}
