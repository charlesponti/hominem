import { trpc } from "~/lib/trpc";

interface SyncOptions {
  calendarId?: string;
  timeMin?: string;
}

export function useGoogleCalendarSync() {
  const utils = trpc.useUtils();

  const syncMutation = trpc.events.syncGoogleCalendar.useMutation({
    onSuccess: () => {
      // Invalidate events list to refresh data
      utils.events.list.invalidate();
      utils.events.getSyncStatus.invalidate();
    },
  });

  const syncStatus = trpc.events.getSyncStatus.useQuery();

  const sync = async (options: SyncOptions) => {
    await syncMutation.mutateAsync({
      calendarId: options.calendarId,
      timeMin: options.timeMin,
    });
  };

  return {
    sync,
    syncStatus: syncStatus.data,
    isSyncing: syncMutation.isPending,
    isLoading: syncStatus.isLoading,
    error: syncMutation.error || syncStatus.error,
  };
}
