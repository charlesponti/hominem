import { useCallback, useState } from 'react'
import { useToast } from '~/components/ui/use-toast'
import { useApiClient } from './use-api-client'

interface SyncableItem {
  id: string
  synced?: boolean
  userId?: string
}

interface UseSyncDataOptions<T extends SyncableItem> {
  isLoggedIn: boolean
  userId?: string | null
  items: T[]
  updateItem: (item: T) => void
  endpoint: string
}

export function useSyncData<T extends SyncableItem>({
  isLoggedIn,
  userId,
  items,
  updateItem,
  endpoint,
}: UseSyncDataOptions<T>) {
  const [isSyncing, setIsSyncing] = useState(false)
  const apiClient = useApiClient()
  const { toast } = useToast()

  const syncData = useCallback(async () => {
    if (!isLoggedIn) return

    try {
      setIsSyncing(true)

      const unsyncedItems = items.filter((item) => !item.synced)

      if (unsyncedItems.length > 0) {
        for (const item of unsyncedItems) {
          try {
            await apiClient.post(endpoint, {
              ...item,
              userId,
            })

            updateItem({
              ...item,
              synced: true,
              userId,
            })
          } catch (error) {
            console.error('Error syncing item:', error)
          }
        }

        toast({
          title: 'Data synced',
          description: `Successfully synced ${unsyncedItems.length} items.`,
        })
      }
    } catch (error) {
      console.error('Error syncing data:', error)
      toast({
        title: 'Sync failed',
        description: 'Could not sync data with server.',
        variant: 'destructive',
      })
    } finally {
      setIsSyncing(false)
    }
  }, [isLoggedIn, userId, items, updateItem, endpoint, apiClient, toast])

  return { syncData, isSyncing }
}
