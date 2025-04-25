import { useEffect, useMemo, useState } from 'react'
import { useToast } from '~/components/ui/use-toast'
import { useApiClient } from '~/lib/hooks/use-api-client'
import { useIndexedDBCollection } from '~/lib/hooks/use-indexdb-collection'
import { useSyncData } from '~/lib/hooks/use-sync-data'

export interface HealthData {
  id: string
  userId?: string
  date: string
  activityType: string
  duration: number
  caloriesBurned: number
  notes: string
  createdAt: string
  updatedAt: string
  synced?: boolean
}

export interface HealthDataFilter {
  startDate?: string
  endDate?: string
  activityType?: string
}

export interface HealthDataInput {
  date: Date
  activityType: string
  duration: number
  caloriesBurned: number
  notes: string
}

export function useHealth(options: {
  isLoggedIn: boolean
  userId?: string
  filters?: HealthDataFilter
}) {
  const { isLoggedIn, userId, filters } = options
  const apiClient = useApiClient()
  const { toast } = useToast()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<HealthDataInput>({
    date: new Date(),
    activityType: '',
    duration: 0,
    caloriesBurned: 0,
    notes: '',
  })

  // IndexedDB collection for health data
  const {
    items: healthData,
    isLoading,
    create: createEntry,
    update: updateEntry,
    delete: deleteEntry,
  } = useIndexedDBCollection<HealthData>({
    collectionKey: 'health_activities',
    dbName: 'hominem',
    version: 1,
  })

  // Sync functionality
  const { syncData: syncDataWithServer, isSyncing } = useSyncData({
    isLoggedIn,
    userId,
    items: healthData,
    updateItem: updateEntry,
    endpoint: '/api/health',
  })

  // Effect to sync data with server when user logs in
  useEffect(() => {
    if (isLoggedIn && !isSyncing) {
      syncDataWithServer()
    }
  }, [isLoggedIn, isSyncing, syncDataWithServer])

  // Filter data based on criteria
  const filteredData = useMemo(() => {
    if (!healthData) return []

    return healthData.filter((entry) => {
      const dateMatches =
        (!filters?.startDate || entry.date >= filters.startDate) &&
        (!filters?.endDate || entry.date <= filters.endDate)

      const typeMatches = !filters?.activityType || entry.activityType === filters.activityType

      return dateMatches && typeMatches
    })
  }, [healthData, filters])

  // Sort data by date (newest first)
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })
  }, [filteredData])

  const handleSubmit = async (formData: HealthDataInput) => {
    try {
      const now = new Date().toISOString()

      if (editingId) {
        // Update existing entry
        const existingEntry = healthData.find((entry) => entry.id === editingId)
        if (!existingEntry) return

        updateEntry({
          ...existingEntry,
          ...formData,
          date: formData.date.toISOString().split('T')[0],
          updatedAt: now,
          synced: false,
        })

        // Sync with server if logged in
        if (isLoggedIn) {
          await apiClient.put(`/api/health/${editingId}`, {
            ...formData,
            date: formData.date.toISOString().split('T')[0],
            userId,
          })
        }
      } else {
        // Create new entry
        const newEntry: Omit<HealthData, 'id'> = {
          date: formData.date.toISOString().split('T')[0],
          activityType: formData.activityType,
          duration: formData.duration,
          caloriesBurned: formData.caloriesBurned,
          notes: formData.notes,
          createdAt: now,
          updatedAt: now,
          synced: false,
          ...(isLoggedIn && { userId }),
        }

        // Save locally
        createEntry(newEntry)

        // Sync with server if logged in
        if (isLoggedIn) {
          await apiClient.post('/api/health', {
            ...newEntry,
            userId,
          })
        }
      }

      // Reset form state
      setIsFormOpen(false)
      setEditingId(null)

      toast({
        title: editingId ? 'Entry updated' : 'Entry created',
        description: editingId
          ? 'Your health activity has been updated.'
          : 'Your new health activity has been saved.',
      })
    } catch (error) {
      console.error('Error saving health data:', error)
      toast({
        title: 'Error',
        description: 'There was a problem saving your data.',
        variant: 'destructive',
      })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      // Delete locally
      deleteEntry(id)

      // Delete from server if logged in
      if (isLoggedIn) {
        await apiClient.delete(`/api/health/${id}`)
      }

      toast({
        title: 'Entry deleted',
        description: 'The health activity has been removed.',
      })
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast({
        title: 'Error',
        description: 'There was a problem deleting your data.',
        variant: 'destructive',
      })
    }
  }

  return {
    healthData: sortedData,
    isLoading,
    isSyncing,
    formData,
    setFormData,
    isFormOpen,
    setIsFormOpen,
    editingId,
    setEditingId,
    handleSubmit,
    handleDelete,
  }
}
