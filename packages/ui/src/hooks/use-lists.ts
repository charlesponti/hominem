import { useApiClient } from '@hominem/ui'
import type { ListSelect as List, ListInsert, ListInviteSelect } from '@hominem/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSupabaseAuth } from './use-supabase-auth'

// Define query keys at the top of the file as constants
const LISTS_KEY = [['lists', 'getAll']]
const LIST_INVITES_KEY = [['lists', 'invites']]

// Type for partial updates with ID
type PartialWithId<T> = Partial<T> & { id: string }

// Type for list invite data
interface ListInvite {
  listId: string
  invitedUserEmail: string
  userId: string
}

// `userId` and `id` are added by the api.
type NewList = Omit<ListInsert, 'userId' | 'id'>

/**
 * Hook for creating a new list
 */
export function useCreateList() {
  const { userId } = useSupabaseAuth()
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<NewList>({
    name: '',
    isPublic: false,
  })
  const [error, setError] = useState<Error | null>(null)

  const createList = useMutation({
    mutationFn: async (listData: ListInsert) => {
      try {
        const response = await apiClient.post<ListInsert, List>('/api/lists', listData)
        return response
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to create list'))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY })
      setError(null)
    },
  })

  return {
    data,
    setData,
    error,
    isLoading: createList.isPending,
    isError: createList.isError,
    createList,
  }
}

/**
 * Hook for updating an existing list
 */
export function useUpdateList() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<List | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const updateList = useMutation({
    mutationFn: async (listData: PartialWithId<List>) => {
      try {
        const response = await apiClient.put<PartialWithId<List>, List>(
          `/api/lists/${listData.id}`,
          listData
        )
        return response
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update list'))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY })
      setError(null)
    },
  })

  return {
    data,
    setData,
    error,
    isLoading: updateList.isPending,
    isError: updateList.isError,
    updateList,
  }
}

/**
 * Hook for deleting a list
 */
export function useDeleteList() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [error, setError] = useState<Error | null>(null)

  const deleteList = useMutation({
    mutationFn: async (id: string) => {
      try {
        return await apiClient.delete<null, { success: boolean }>(`/api/lists/${id}`)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to delete list'))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LISTS_KEY })
      setError(null)
    },
  })

  return {
    error,
    isLoading: deleteList.isPending,
    isError: deleteList.isError,
    deleteList,
  }
}

/**
 * Hook for fetching all lists with customizable options
 */
export function useLists(options = {}) {
  const { userId } = useSupabaseAuth()
  const apiClient = useApiClient()

  // Default options with sensible values
  const defaultOptions = {
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }

  const query = useQuery<List[]>({
    queryKey: LISTS_KEY,
    queryFn: async () => {
      return await apiClient.get<null, List[]>('/api/lists')
    },
    ...defaultOptions,
    ...options,
  })

  return {
    lists: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for fetching a specific list by ID
 */
export function useList(id: string, options = {}) {
  const { userId } = useSupabaseAuth()
  const apiClient = useApiClient()

  // Default options with sensible values
  const defaultOptions = {
    enabled: !!userId && !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }

  const queryKey = [...LISTS_KEY, id]

  const query = useQuery<List>({
    queryKey,
    queryFn: async () => {
      return await apiClient.get<null, List>(`/api/lists/${id}`)
    },
    ...defaultOptions,
    ...options,
  })

  return {
    list: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for sending a list invite
 */
export function useSendListInvite() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [data, setData] = useState<ListInvite | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const sendInvite = useMutation({
    mutationFn: async (inviteData: { listId: string; email: string }) => {
      try {
        const { listId, email } = inviteData
        return await apiClient.post<{ email: string }, { invite: List }>(
          `/api/lists/${listId}/invites`,
          { email }
        )
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to send list invite'))
        throw err
      }
    },
    onSuccess: (result, variables) => {
      // Invalidate both lists and invites queries
      queryClient.invalidateQueries({ queryKey: LISTS_KEY })
      queryClient.invalidateQueries({ queryKey: LIST_INVITES_KEY })
      queryClient.invalidateQueries({ queryKey: [...LISTS_KEY, variables.listId, 'invites'] })
      setError(null)
    },
  })

  return {
    data,
    setData,
    error,
    isLoading: sendInvite.isPending,
    isError: sendInvite.isError,
    sendInvite,
  }
}

/**
 * Hook for accepting a list invite
 */
export function useAcceptListInvite() {
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [error, setError] = useState<Error | null>(null)

  const acceptInvite = useMutation({
    mutationFn: async (listId: string) => {
      try {
        return await apiClient.post<null, { message: string; data: boolean }>(
          `/api/invites/${listId}/accept`,
          null
        )
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to accept list invite'))
        throw err
      }
    },
    onSuccess: () => {
      // Invalidate both lists and invites queries
      queryClient.invalidateQueries({ queryKey: LISTS_KEY })
      queryClient.invalidateQueries({ queryKey: LIST_INVITES_KEY })
      setError(null)
    },
  })

  return {
    error,
    isLoading: acceptInvite.isPending,
    isError: acceptInvite.isError,
    acceptInvite,
  }
}

/**
 * Hook for fetching list invites
 */
export function useListInvites(options = {}) {
  const { userId } = useSupabaseAuth()
  const apiClient = useApiClient()

  // Default options with sensible values
  const defaultOptions = {
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }

  const query = useQuery<List[]>({
    queryKey: LIST_INVITES_KEY,
    queryFn: async () => {
      return await apiClient.get<null, List[]>('/api/invites')
    },
    ...defaultOptions,
    ...options,
  })

  return {
    invites: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}

/**
 * Hook for fetching invites for a specific list
 */
export function useListInvitesByList(listId: string, options = {}) {
  const { userId } = useSupabaseAuth()
  const apiClient = useApiClient()

  // Default options with sensible values
  const defaultOptions = {
    enabled: !!userId && !!listId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }

  const queryKey = [...LISTS_KEY, listId, 'invites']

  const query = useQuery<ListInviteSelect[]>({
    queryKey,
    queryFn: async () => {
      return await apiClient.get<null, ListInviteSelect[]>(`/api/lists/${listId}/invites`)
    },
    ...defaultOptions,
    ...options,
  })

  return {
    invites: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
