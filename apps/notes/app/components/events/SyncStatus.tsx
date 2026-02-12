import { getTimeAgo } from '@hominem/utils/time';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import i18n from '~/lib/i18n';

interface SyncStatusProps {
  lastSyncedAt: string | Date | null;
  syncError: string | null;
  eventCount: number;
  connected: boolean;
}

export default function SyncStatus({
  lastSyncedAt,
  syncError,
  eventCount,
  connected,
}: SyncStatusProps) {
  const [timeAgo, setTimeAgo] = useState<string>('');

  useEffect(() => {
    const updateTimeAgo = () => {
      setTimeAgo(getTimeAgo(lastSyncedAt, 'Never synced'));
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [lastSyncedAt]);

  if (!connected) {
    return (
      <div className="px-4 py-2  border text-sm bg-muted border-border text-muted-foreground">
        <span className="mr-2">📅</span>
        Google Calendar not connected
      </div>
    );
  }

  return (
    <div className="px-4 py-2  border text-sm flex items-center gap-3 bg-muted border-border">
      {syncError ? (
        <>
          <AlertCircle className="size-4 text-destructive" />
          <div className="flex-1">
            <div className="text-foreground">Sync error</div>
            <div className="text-xs text-muted-foreground">{syncError}</div>
          </div>
        </>
      ) : (
        <>
          <CheckCircle className="size-4 text-success" />
          <div className="flex-1">
            <div className="text-foreground">{i18n.t('event_count', { count: eventCount })}</div>
            <div className="text-xs text-muted-foreground">Last synced: {timeAgo}</div>
          </div>
        </>
      )}
    </div>
  );
}
