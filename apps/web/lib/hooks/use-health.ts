import { useApiClient } from '@/lib/hooks/use-api-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export interface HealthData {
  id: number
  userId: string
  date: string
  activityType: string
  duration: number
  caloriesBurned: number
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface HealthDataFilter {
  startDate?: string
  endDate?: string
  activityType?: string
  userId?: string
}

export interface HealthDataInput {
  userId: string
  date: Date
  activityType: string
  duration: number
  caloriesBurned: number
  notes?: string
}

export interface HealthDataUpdateInput {
  id: number
  date?: Date
  activityType?: string
  duration?: number
  caloriesBurned?: number
  notes?: string
}

// React Query keys
const HEALTH_KEY = 'health'

export function useCreateHealthData() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<HealthDataInput | null>(null)

  const createHealthData = useMutation({
    mutationFn: (data: HealthDataInput) =>
      apiClient.post<HealthDataInput, HealthData>('/api/health', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['health'] })
    },
  })

  return {
    data,
    setData,
    createHealthData,
  }
}

export function useUpdateHealthData() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<HealthDataUpdateInput | null>(null)

  const updateHealthData = useMutation({
    mutationFn: (updateData: HealthDataUpdateInput) => {
      return apiClient.put<HealthDataUpdateInput, HealthData>(
        `/api/health/${updateData.id}`,
        updateData
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HEALTH_KEY] })
    },
  })

  return {
    data,
    setData,
    updateHealthData,
  }
}

export function useDeleteHealthData() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()

  const deleteHealthData = useMutation({
    mutationFn: (id: number) => apiClient.delete<null, { success: boolean }>(`/api/health/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [HEALTH_KEY] })
    },
  })

  return {
    deleteHealthData,
  }
}

export function useHealth(filters?: HealthDataFilter) {
  const apiClient = useApiClient()

  // Build query string for filters
  const queryParams = new URLSearchParams()
  if (filters?.startDate) queryParams.append('startDate', filters.startDate)
  if (filters?.endDate) queryParams.append('endDate', filters.endDate)
  if (filters?.activityType) queryParams.append('activityType', filters.activityType)
  if (filters?.userId) queryParams.append('userId', filters.userId)

  const queryString = queryParams.toString()
  const endpoint = `/api/health${queryString ? `?${queryString}` : ''}`

  // Get health data with optional filters
  const { data, isLoading, error } = useQuery<HealthData[]>({
    queryKey: [HEALTH_KEY, filters],
    queryFn: () => apiClient.get<null, HealthData[]>(endpoint),
  })

  return {
    data,
    isLoading,
    error,
  }
}
