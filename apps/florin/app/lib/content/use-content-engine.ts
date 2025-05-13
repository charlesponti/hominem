/**
 * Unified Content Management Engine
 *
 * Implements a local-first architecture for all content types:
 * 1. Operations on local IndexedDB first for offline support.
 * 2. Sync with API server when online and authenticated.
 * 3. Data fetching merges local and server data.
 *
 * Assumes API endpoints under /api/content for CRUD and sync.
 * Uses Content type from @hominem/utils/types.
 */
import { useAuth } from '@clerk/react-router'
import { dbOperation, useApiClient } from '@hominem/ui'
import type { Content, ContentType, TaskMetadata } from '@hominem/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useToast } from '~/components/ui/use-toast'

const DB_NAME = 'HominemDataStore'
const DB_VERSION = 1
const STORE_NAME = 'contentItems'

const CONTENT_QUERY_KEY_BASE = 'unifiedContent'

type PartialWithId<T> = Partial<T> & { id: string }

export interface UseContentEngineOptions {
  type?: ContentType | ContentType[]
  tags?: string[]
  searchText?: string
  querySuffix?: string
}

const setupContentStore = (store: IDBObjectStore) => {
  store.createIndex('type', 'type', { unique: false })
  store.createIndex('synced', 'synced', { unique: false })
  store.createIndex('updatedAt', 'updatedAt', { unique: false })
  store.createIndex('userId', 'userId', { unique: false })
  store.createIndex('userId_type_updatedAt', ['userId', 'type', 'updatedAt'], { unique: false })
}

const CONTENT_DB_OPERATIONS_OPTIONS = {
  dbName: DB_NAME,
  version: DB_VERSION,
  storeName: STORE_NAME,
  setupStore: setupContentStore,
}

const defaultContentFields = (
  type: ContentType = 'note'
): Omit<Content, 'id' | 'content' | 'userId'> => ({
  type,
  title: '',
  tags: [],
  synced: false,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  mentions: [],
  taskMetadata:
    type === 'task' || type === 'timer'
      ? ({
          status: 'todo',
          priority: 'medium',
          dueDate: null,
          completed: false,
          // Time tracking fields for timer
          startTime: undefined,
          endTime: undefined,
          isActive: false,
          duration: 0,
        } as TaskMetadata)
      : null,
  analysis: {},
})

const dbBatchPut = async (items: Content[]): Promise<void> => {
  if (items.length === 0) return
  await dbOperation<void>({
    ...CONTENT_DB_OPERATIONS_OPTIONS,
    mode: 'readwrite',
    operation: (store) => {
      let lastRequest: IDBRequest<IDBValidKey> | null = null
      for (const item of items) {
        lastRequest = store.put(item)
      }
      return lastRequest as unknown as IDBRequest<void>
    },
  })
}

export function useContentEngine(options: UseContentEngineOptions = {}) {
  const { userId, isSignedIn } = useAuth()
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const [error, setError] = useState<Error | null>(null)

  const getQueryKey = (): (string | string[])[] => {
    const key: (string | string[])[] = [CONTENT_QUERY_KEY_BASE]
    if (options.type) {
      key.push(Array.isArray(options.type) ? options.type.join(',') : options.type)
    }
    if (options.tags && options.tags.length > 0) {
      key.push(['tags', ...options.tags])
    }
    if (options.searchText) {
      key.push(['search', options.searchText])
    }
    if (options.querySuffix) {
      key.push(options.querySuffix)
    }
    return key
  }

  const applyFilters = (items: Content[]): Content[] => {
    let filtered = items
    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type]
      filtered = filtered.filter((item) => types.includes(item.type))
    }
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter((item) =>
        options.tags?.some((tagValue) => item.tags?.some((itemTag) => itemTag.value === tagValue))
      )
    }
    if (options.searchText) {
      const searchLower = options.searchText.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(searchLower) ||
          item.content.toLowerCase().includes(searchLower)
      )
    }
    return filtered.filter((item) => (userId ? item.userId === userId : true))
  }

  const { data: contentItems = [], isLoading } = useQuery<Content[]>({
    queryKey: getQueryKey(),
    queryFn: async () => {
      try {
        let localItems = await dbOperation<Content[]>({
          ...CONTENT_DB_OPERATIONS_OPTIONS,
          mode: 'readonly',
          operation: (store) => store.getAll(),
        })
        localItems = localItems.filter((item) => (userId ? item.userId === userId : true))

        if (isSignedIn && userId) {
          try {
            const queryParams = new URLSearchParams()
            if (options.type) {
              const types = Array.isArray(options.type) ? options.type : [options.type]
              for (const t of types) {
                queryParams.append('type', t)
              }
            }

            const serverContent = await apiClient.get<null, Content[]>(
              `/api/content${queryParams.toString() ? `?${queryParams.toString()}` : ''}`
            )

            if (serverContent && serverContent.length > 0) {
              const localContentMap = new Map(localItems.map((item) => [item.id, item]))
              const itemsToUpdateInDB: Content[] = []

              for (const serverItem of serverContent) {
                const localItem = localContentMap.get(serverItem.id)
                if (!localItem || new Date(serverItem.updatedAt) > new Date(localItem.updatedAt)) {
                  itemsToUpdateInDB.push({ ...serverItem, userId, synced: true })
                }
              }
              if (itemsToUpdateInDB.length > 0) {
                await dbBatchPut(itemsToUpdateInDB)
                localItems = await dbOperation<Content[]>({
                  ...CONTENT_DB_OPERATIONS_OPTIONS,
                  mode: 'readonly',
                  operation: (store) => store.getAll(),
                })
                localItems = localItems.filter((item) => item.userId === userId)
              }
            }
          } catch (apiErr) {
            console.warn('API fetch/merge error, using local data:', apiErr)
          }
        }
        return applyFilters(localItems)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch content items'))
        return []
      }
    },
    enabled: !!userId || !isSignedIn,
    staleTime: 1000 * 60 * 1, // 1 minute
  })

  const createItem = useMutation({
    mutationFn: async (
      itemData: { type: ContentType; content: string } & Partial<
        Pick<
          Content,
          'title' | 'tags' | 'synced' | 'createdAt' | 'updatedAt' | 'taskMetadata' | 'analysis'
        >
      >
    ) => {
      if (!userId) {
        throw new Error('User ID not available for creating item.')
      }
      const now = new Date().toISOString()
      const newItem: Content = {
        ...defaultContentFields(itemData.type),
        ...itemData,
        id: crypto.randomUUID(),
        userId,
        createdAt: itemData.createdAt || now,
        updatedAt: itemData.updatedAt || now,
        synced: false,
      }

      await dbOperation({
        ...CONTENT_DB_OPERATIONS_OPTIONS,
        mode: 'readwrite',
        operation: (store) => store.add(newItem),
      })

      if (isSignedIn && userId) {
        try {
          const serverResponse = await apiClient.post<Content, Content>('/api/content', newItem)
          if (serverResponse) {
            await dbOperation({
              ...CONTENT_DB_OPERATIONS_OPTIONS,
              mode: 'readwrite',
              operation: (store) => {
                store.delete(newItem.id)
                return store.put({ ...serverResponse, synced: true })
              },
            })
            return serverResponse
          }
        } catch (apiErr) {
          console.warn('API create error, item will sync later:', apiErr)
        }
      }
      return newItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
      setError(null)
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error('Failed to create item'))
    },
  })

  const updateItem = useMutation({
    mutationFn: async (itemData: PartialWithId<Content>) => {
      const existingItem = await dbOperation<Content | undefined>({
        ...CONTENT_DB_OPERATIONS_OPTIONS,
        mode: 'readonly',
        operation: (store) => store.get(itemData.id),
      })
      if (!existingItem) throw new Error(`Item with ID ${itemData.id} not found`)

      const updatedItem: Content = {
        ...existingItem,
        ...itemData,
        updatedAt: new Date().toISOString(),
        synced: false,
      }

      await dbOperation({
        ...CONTENT_DB_OPERATIONS_OPTIONS,
        mode: 'readwrite',
        operation: (store) => store.put(updatedItem),
      })

      if (isSignedIn && userId) {
        try {
          const serverResponse = await apiClient.put<Content, Content>(
            `/api/content/${itemData.id}`,
            updatedItem
          )
          if (serverResponse) {
            await dbOperation({
              ...CONTENT_DB_OPERATIONS_OPTIONS,
              mode: 'readwrite',
              operation: (store) => store.put({ ...serverResponse, synced: true }),
            })

            return serverResponse
          }
        } catch (apiErr) {
          console.warn('API update error, item will sync later:', apiErr)
        }
      }

      return updatedItem
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
      setError(null)
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error('Failed to update item'))
    },
  })

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const itemToDelete = await dbOperation<Content | undefined>({
        ...CONTENT_DB_OPERATIONS_OPTIONS,
        mode: 'readonly',
        operation: (store) => store.get(id),
      })
      await dbOperation({
        ...CONTENT_DB_OPERATIONS_OPTIONS,
        mode: 'readwrite',
        operation: (store) => store.delete(id),
      })

      if (isSignedIn && userId) {
        try {
          await apiClient.delete<null, { success: boolean }>(`/api/content/${id}`)
        } catch (apiErr) {
          console.warn('API delete error, item marked for sync deletion later:', apiErr)
        }
      }

      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
      setError(null)
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error('Failed to delete item'))
    },
  })

  const syncItems = useMutation({
    mutationFn: async () => {
      if (!isSignedIn || !userId) throw new Error('User not authenticated for sync')

      const unsyncedItems = await dbOperation<Content[]>({
        ...CONTENT_DB_OPERATIONS_OPTIONS,
        mode: 'readonly',
        operation: (store) => store.index('synced').getAll(IDBKeyRange.only(false)),
      })
      const userUnsyncedItems = unsyncedItems.filter((item) => item.userId === userId)

      if (userUnsyncedItems.length === 0) {
        toast({ title: 'Content Synced', description: 'All items are already up to date.' })
        return { message: 'No items to sync' }
      }

      try {
        const response = await apiClient.post<Content[], { syncedItems: Content[] }>(
          '/api/content/sync',
          userUnsyncedItems
        )

        if (response?.syncedItems) {
          await dbBatchPut(response.syncedItems)
          toast({
            title: 'Content Synced',
            description: 'Content successfully synced with the server.',
          })
          return response
        }
        throw new Error('Sync response invalid')
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to sync items'))
        toast({ title: 'Sync Failed', description: (err as Error).message, variant: 'destructive' })
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getQueryKey() })
    },
  })

  return {
    items: contentItems,
    createItem: createItem.mutate,
    updateItem: updateItem.mutate,
    deleteItem: deleteItem.mutate,
    syncItems: syncItems.mutate,
    isLoading,
    isCreating: createItem.isLoading,
    isUpdating: updateItem.isLoading,
    isDeleting: deleteItem.isLoading,
    isSyncing: syncItems.isLoading,
    error,
    isError: !!error,
    refetch: () => queryClient.invalidateQueries({ queryKey: getQueryKey() }),
  }
}
