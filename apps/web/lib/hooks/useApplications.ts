import { useApiClient } from '@/lib/hooks/use-api-client'
import { useAuth } from '@clerk/nextjs'
import type { JobApplication, JobApplicationInsert } from '@hominem/utils/schema'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

const APPLICATIONS_KEY = [['applications', 'getAll']]

export function useCreateApplication() {
  const queryClient = useQueryClient()
  const api = useApiClient()
  const [data, setData] = useState<JobApplicationInsert>()

  const createApplication = useMutation({
    mutationFn: async (data: JobApplicationInsert) => {
      const response = await api.post<JobApplicationInsert, JobApplication>(
        '/api/job-applications',
        data
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY })
    },
  })

  return {
    data,
    setData,
    createApplication,
  }
}

type PartialWithId<T> = Partial<T> & { id: string }

export function useUpdateApplication() {
  const queryClient = useQueryClient()
  const api = useApiClient()
  const [data, setData] = useState<JobApplication | null>(null)

  const updateApplication = useMutation({
    mutationFn: async (data: PartialWithId<JobApplication>) => {
      const response = await api.put<PartialWithId<JobApplication>, JobApplication>(
        `/api/job-applications/${data.id}`,
        data
      )
      return response
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY })
    },
  })

  return {
    data,
    setData,
    updateApplication,
  }
}

export function useDeleteApplication() {
  const queryClient = useQueryClient()
  const api = useApiClient()

  const mutation = useMutation({
    mutationFn: (id: string) => {
      return api.delete(`/api/job-applications/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY })
    },
  })

  return mutation
}

export function useApplications() {
  const { userId } = useAuth()
  const api = useApiClient()
  const query = useQuery<JobApplication[]>({
    queryKey: APPLICATIONS_KEY,
    queryFn: async () => {
      const data = await api.get<null, JobApplication[]>('/api/job-applications')
      return data
    },
    enabled: !!userId,
  })

  return query
}
