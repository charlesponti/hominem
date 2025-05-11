import { useAuth } from '@clerk/react-router'
import type { JobApplication, JobApplicationInsert } from '@hominem/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { JobApplicationStatus } from '~/lib/career'
import { useApiClient } from '~/lib/hooks/use-api-client'

// Define query keys at the top for consistent cache management
const APPLICATIONS_KEY = [['applications', 'getAll']]

// Type for partial updates with ID
type PartialWithId<T> = Partial<T> & { id: string }

/**
 * Hook for creating a new job application
 */
export function useCreateApplication() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<JobApplicationInsert>({
    position: '',
    stages: [{ date: new Date().toISOString().split('T')[0], stage: 'Applied' }],
    status: JobApplicationStatus.APPLIED,
    companyId: '',
    userId: '',
  })
  const [error, setError] = useState<Error | null>(null)

  const createApplication = useMutation({
    mutationFn: async (applicationData: JobApplicationInsert) => {
      try {
        const response = await apiClient.post<JobApplicationInsert, JobApplication>(
          '/api/job-applications',
          applicationData
        )
        return response
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create application'))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY })
      setError(null)
    },
  })

  return {
    data,
    setData,
    error,
    isLoading: createApplication.isLoading,
    isError: createApplication.isError,
    createApplication,
  }
}

/**
 * Hook for updating an existing job application
 */
export function useUpdateApplication() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<JobApplication | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const updateApplication = useMutation({
    mutationFn: async (applicationData: PartialWithId<JobApplication>) => {
      try {
        const response = await apiClient.put<PartialWithId<JobApplication>, JobApplication>(
          `/api/job-applications/${applicationData.id}`,
          applicationData
        )
        return response
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update application'))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY })
      setError(null)
    },
  })

  return {
    data,
    setData,
    error,
    isLoading: updateApplication.isLoading,
    isError: updateApplication.isError,
    updateApplication,
  }
}

/**
 * Hook for deleting a job application
 */
export function useDeleteApplication() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [error, setError] = useState<Error | null>(null)

  const deleteApplication = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await apiClient.delete<null, { success: boolean }>(`/api/job-applications/${id}`)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete application'))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY })
      setError(null)
    },
  })

  return {
    error,
    isLoading: deleteApplication.isLoading,
    isError: deleteApplication.isError,
    deleteApplication,
  }
}

/**
 * Hook for fetching job applications with optional filtering
 */
export function useApplications(options = {}) {
  const { userId } = useAuth()
  const apiClient = useApiClient()

  // Default options with sensible values
  const defaultOptions = {
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }

  const query = useQuery<JobApplication[]>({
    queryKey: APPLICATIONS_KEY,
    queryFn: async () => {
      return await apiClient.get<null, JobApplication[]>('/api/job-applications')
    },
    ...defaultOptions,
    ...options,
  })

  return {
    applications: query.data || [],
    ...query,
  }
}

/**
 * Hook for fetching a single job application by ID
 */
export function useApplication(id: string, options = {}) {
  const { userId } = useAuth()
  const apiClient = useApiClient()

  // Default options with sensible values
  const defaultOptions = {
    enabled: !!userId && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }

  const queryKey = [...APPLICATIONS_KEY, id]

  const query = useQuery<JobApplication>({
    queryKey,
    queryFn: async () => {
      return await apiClient.get<null, JobApplication>(`/api/job-applications/${id}`)
    },
    ...defaultOptions,
    ...options,
  })

  return {
    application: query.data,
    ...query,
  }
}
