/**
 * Unified Content Management Engine
 *
 * Implements an API-only architecture for all content types:
 * 1. Operations directly interact with the API server.
 * 2. Data fetching relies on server-side filtering and user authentication.
 *
 * Assumes API endpoints under /api/content for CRUD.
 * Uses Content type from @hominem/utils/types.
 */
import { useAuth } from '@clerk/react-router'
import { useApiClient } from '@hominem/ui'
import type { Content, ContentType, TaskMetadata, TaskStatus } from '@hominem/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../components/ui/use-toast'

const CONTENT_QUERY_KEY_BASE = 'content'

const defaultContentFields = (
  type: ContentType = 'note'
): Omit<
  Content,
  'id' | 'content' | 'userId' | 'createdAt' | 'updatedAt' | 'synced' | 'mentions'
> => ({
  type,
  title: '',
  tags: [],
  taskMetadata:
    type === 'task' || type === 'timer'
      ? ({
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          completed: false,
          startTime: undefined,
          endTime: undefined,
          isActive: false,
          duration: 0,
        } as TaskMetadata)
      : null,
  analysis: {},
})

interface UseContentEngineOptions {
  type?: ContentType | ContentType[]
  tags?: string[]
  searchText?: string
  querySuffix?: string
}

export function useContentEngine(options: UseContentEngineOptions = {}) {
  const { userId, isSignedIn } = useAuth()
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const getQueryKey = (): unknown[] => {
    const key: unknown[] = [CONTENT_QUERY_KEY_BASE]
    if (userId) key.push(userId)
    if (options.type) {
      key.push(`type: ${Array.isArray(options.type) ? options.type.join(',') : options.type}`)
    }
    if (options.tags && options.tags.length > 0) {
      key.push(`tags: ${options.tags.sort().join(',')}`)
    }
    if (options.searchText) {
      key.push(options.searchText)
    }
    if (options.querySuffix) {
      key.push(options.querySuffix)
    }
    console.log('Query key:', key)
    return key
  }

  const contentQuery = useQuery<Content[], Error>({
    queryKey: getQueryKey(),
    queryFn: async () => {
      if (!isSignedIn || !userId) {
        return []
      }

      const queryParams = new URLSearchParams()
      if (options.type) {
        const types = Array.isArray(options.type) ? options.type : [options.type]
        console.log('types', types)
        for (const t of types) {
          queryParams.append('types[]', t)
        }
      }
      if (options.tags && options.tags.length > 0) {
        for (const tag of options.tags) {
          queryParams.append('tags', tag)
        }
      }
      if (options.searchText) {
        queryParams.append('query', options.searchText)
      }
      const url = `/api/content${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
      const serverContent = await apiClient.get<null, Content[]>(url)
      return serverContent || []
    },
    enabled: !!isSignedIn && !!userId,
    staleTime: 1000 * 60 * 1, // 1 minute
    onError: (error: Error) => {
      console.error('Fetch content error:', error)
      toast({
        variant: 'destructive',
        title: 'Error Fetching Content',
        description: error.message || 'Could not load data from server.',
      })
    },
  })

  const createItem = useMutation<
    Content,
    Error,
    { type: ContentType; content: string } & Partial<
      Omit<
        Content,
        'id' | 'userId' | 'content' | 'type' | 'createdAt' | 'updatedAt' | 'synced' | 'mentions'
      >
    >
  >({
    mutationFn: async (itemData) => {
      if (!isSignedIn || !userId) {
        throw new Error('User must be signed in to create content.')
      }

      const payloadForApi: Omit<
        Content,
        'id' | 'userId' | 'createdAt' | 'updatedAt' | 'synced' | 'mentions'
      > & { content: string } = {
        ...defaultContentFields(itemData.type),
        ...itemData,
      }

      const serverResponse = await apiClient.post<typeof payloadForApi, Content>(
        '/api/content',
        payloadForApi
      )
      if (!serverResponse) {
        throw new Error('API did not return created content (unexpected response).')
      }
      return serverResponse
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
      toast({
        title: `${data.type} created`,
        description: data.title || 'Item successfully created.',
      })
    },
    onError: (error: Error) => {
      console.error('Create item error:', error)
      toast({
        variant: 'destructive',
        title: 'Error Creating Item',
        description: error.message || 'Could not save item to server.',
      })
    },
  })

  const updateItem = useMutation<
    Content,
    Error,
    { id: string } & Partial<
      Omit<Content, 'id' | 'userId' | 'createdAt' | 'updatedAt' | 'synced' | 'mentions'>
    >
  >({
    mutationFn: async (itemData) => {
      if (!isSignedIn || !userId) {
        throw new Error('User must be signed in to update content.')
      }
      if (!itemData.id) {
        throw new Error('Item ID is required for update.')
      }
      const items = contentQuery.data || []
      const existing = items.find((item) => item.id === itemData.id)
      if (!existing) {
        throw new Error('Item not found for update.')
      }
      const { id, ...updateFields } = itemData
      // Deep merge for taskMetadata if present
      let mergedTaskMetadata = undefined
      if ('taskMetadata' in updateFields && existing.taskMetadata) {
        mergedTaskMetadata = { ...existing.taskMetadata, ...updateFields.taskMetadata }
      }
      const merged = {
        ...existing,
        ...updateFields,
        ...(mergedTaskMetadata ? { taskMetadata: mergedTaskMetadata } : {}),
      }
      // Exclude forbidden fields
      const {
        id: _id,
        userId: _userId,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        synced: _synced,
        mentions: _mentions,
        ...allowedFields
      } = merged
      const serverResponse = await apiClient.put<typeof allowedFields, Content>(
        `/api/content/${id}`,
        allowedFields
      )
      if (!serverResponse) {
        throw new Error('API did not return updated content (unexpected response).')
      }
      return serverResponse
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
      toast({
        title: `${data.type} updated`,
        description: data.title || 'Item successfully updated.',
      })
    },
    onError: (error: Error) => {
      console.error('Update item error:', error)
      toast({
        variant: 'destructive',
        title: 'Error Updating Item',
        description: error.message || 'Could not update item on server.',
      })
    },
  })

  const deleteItem = useMutation<{ id: string }, Error, string>({
    mutationFn: async (id: string) => {
      if (!isSignedIn || !userId) {
        throw new Error('User must be signed in to delete content.')
      }
      const items = contentQuery.data || []
      const existing = items.find((item) => item.id === id)
      if (!existing) {
        throw new Error('Item not found for delete.')
      }
      const response = await apiClient.delete<null, { id: string }>(`/api/content/${id}`)
      if (!response || typeof response.id !== 'string') {
        throw new Error('API did not return expected confirmation for delete.')
      }
      return response
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
      toast({ title: 'Item Deleted', description: 'Item successfully deleted.' })
    },
    onError: (error: Error) => {
      console.error('Delete item error:', error)
      toast({
        variant: 'destructive',
        title: 'Error Deleting Item',
        description: error.message || 'Could not delete item from server.',
      })
    },
  })

  function updateTaskStatus({ taskId, status }: { taskId: string; status: TaskStatus }) {
    const task = contentQuery.data?.find((item) => item.id === taskId)
    if (!task) {
      console.error(`Task with ID ${taskId} not found`)
      return
    }
    updateItem.mutate({ id: taskId, taskMetadata: { status, ...task.taskMetadata } })
  }

  function toggleTaskCompletion(taskId: string) {
    const task = contentQuery.data?.find((item) => item.id === taskId)
    if (!task) {
      console.error(`Task with ID ${taskId} not found`)
      return
    }
    updateItem.mutate({ id: taskId, taskMetadata: { status: 'done', ...task.taskMetadata } })
  }

  return {
    contentItems: contentQuery.data || [],
    isLoading: contentQuery.isLoading,
    isFetching: contentQuery.isFetching,
    error: contentQuery.error,
    refetchContent: contentQuery.refetch,
    createItem,
    updateItem,
    deleteItem,
    updateTaskStatus,
    toggleTaskCompletion,
  }
}
