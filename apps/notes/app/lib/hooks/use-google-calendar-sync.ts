import { useCallback, useState } from "react";
import { trpc } from "~/lib/trpc";

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

  const syncMutation = trpc.events.syncGoogleCalendar.useMutation();

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
        success: syncResult.success,
        syncedEvents: syncResult.created + syncResult.updated,
        totalEvents:
          syncResult.created + syncResult.updated + syncResult.deleted,
        events: [],
        error:
          syncResult.errors.length > 0
            ? syncResult.errors.join(", ")
            : undefined,
      });
    } catch (error) {
      setResult({
        success: false,
        syncedEvents: 0,
        totalEvents: 0,
        events: [],
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const utils = trpc.useUtils();

  const getCalendars = useCallback(async () => {
    const calendars = await utils.events.getGoogleCalendars.fetch();
    return calendars;
  }, [utils]);

  return {
    syncCalendar,
    getCalendars,
    isLoading: isLoading || syncMutation.isPending,
    result,
  };
}
