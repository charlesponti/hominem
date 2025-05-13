import { useEffect, useMemo, useState } from 'react'
import type { SyncableEntity } from './use-local-data'
import { useLocalData } from './use-local-data'

export interface HealthData extends SyncableEntity {
  date: string
  activityType: string
  duration: number
  caloriesBurned: number
  notes: string
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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<HealthDataInput>({
    date: new Date(),
    activityType: '',
    duration: 0,
    caloriesBurned: 0,
    notes: '',
  })

  // Using new useLocalData hook for health data
  const {
    items: healthData,
    isLoading,
    create: createEntry,
    update: updateEntry,
    delete: deleteEntry,
    sync: syncDataWithServer,
    isSyncing,
    error,
  } = useLocalData<HealthData>({
    queryKey: ['health_activities'],
    endpoint: '/api/health',
    storeName: 'health_activities',
    dbName: 'hominem',
    version: 1,
  })

  // Effect to sync data with server when user logs in
  useEffect(() => {
    if (isLoggedIn && !isSyncing && userId) {
      syncDataWithServer()
    }
  }, [isLoggedIn, isSyncing, syncDataWithServer, userId])

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

  const handleSubmit = async () => {
    try {
      if (editingId) {
        // Update existing entry
        const existingEntry = healthData.find((entry) => entry.id === editingId)
        if (!existingEntry) return

        updateEntry({
          id: editingId,
          ...formData,
          date: formData.date.toISOString().split('T')[0],
        })
      } else {
        // Create new entry
        const newEntry = {
          date: formData.date.toISOString().split('T')[0],
          activityType: formData.activityType,
          duration: formData.duration,
          caloriesBurned: formData.caloriesBurned,
          notes: formData.notes,
        }

        // Save locally
        createEntry(newEntry)
      }

      // If user is logged in, sync with server
      if (isLoggedIn && userId) {
        syncDataWithServer()
      }

      // Reset form state
      setIsFormOpen(false)
      setEditingId(null)
    } catch (error) {
      console.error('Error saving health data:', error)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      // Delete locally
      deleteEntry(id)

      // If user is logged in, sync deletion with server
      if (isLoggedIn && userId) {
        syncDataWithServer()
      }
    } catch (error) {
      console.error('Error deleting entry:', error)
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
    error,
  }
}
