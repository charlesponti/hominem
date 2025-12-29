import { useEffect, useState } from 'react'
import { getTimeAgo } from '@hominem/utils/time'
import { AlertCircle, CheckCircle } from 'lucide-react'

interface SyncStatusProps {
  lastSyncedAt: Date | null
  syncError: string | null
  eventCount: number
  connected: boolean
}

export default function SyncStatus({
  lastSyncedAt,
  syncError,
  eventCount,
  connected,
}: SyncStatusProps) {
  const [timeAgo, setTimeAgo] = useState<string>('')

  useEffect(() => {
    const updateTimeAgo = () => {
      setTimeAgo(getTimeAgo(lastSyncedAt, 'Never synced'))
    }

    updateTimeAgo()
    const interval = setInterval(updateTimeAgo, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [lastSyncedAt])

  if (!connected) {
    return (
      <div className="px-4 py-2 rounded-lg border text-sm bg-muted border-border text-muted-foreground">
        <span className="mr-2">📅</span>
        Google Calendar not connected
      </div>
    )
  }

  return (
    <div className="px-4 py-2 rounded-lg border text-sm flex items-center gap-3 bg-muted border-border">
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
            <div className="text-foreground">
              {eventCount} Google Calendar event{eventCount === 1 ? '' : 's'}
            </div>
            <div className="text-xs text-muted-foreground">Last synced: {timeAgo}</div>
          </div>
        </>
      )}
    </div>
  )
}
