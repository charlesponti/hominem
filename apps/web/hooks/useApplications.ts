import { useAuth } from '@clerk/nextjs'
import type { JobApplication, JobApplicationInsert } from '@ponti/utils/schema'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

// React Query keys
const APPLICATIONS_KEY = [['applications', 'getAll']]

export function useCreateApplication() {
  const queryClient = useQueryClient()
  const [data, setData] = useState<JobApplicationInsert>()

  const createApplication = useMutation({
    mutationFn: async (data: JobApplicationInsert) => {
      const response = await fetch('/api/applications', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      const res = await response.json()
      return res
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
  const [data, setData] = useState<JobApplication | null>(null)

  const updateApplication = useMutation({
    mutationFn: async (data: PartialWithId<JobApplication>) => {
      const response = await fetch(`/api/applications/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      })
      return response.json()
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

  const mutation = useMutation({
    mutationFn: (id: string) => {
      return fetch(`/api/applications/${id}`, {
        method: 'DELETE',
      }).then((res) => res.json())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPLICATIONS_KEY })
    },
  })

  return mutation
}

export function useApplications() {
  const { userId } = useAuth()

  const query = useQuery<JobApplication[]>({
    queryKey: APPLICATIONS_KEY,
    queryFn: async () => {
      const res = await fetch('/api/applications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${userId}`,
        },
      })
      if (!res.ok) {
        return []
      }
      const data = await res.json()
      return data
    },
    enabled: !!userId,
  })

  return query
}
