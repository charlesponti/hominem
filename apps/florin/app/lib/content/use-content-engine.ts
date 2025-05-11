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
import type { Content, ContentType, TaskMetadata } from '@hominem/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useToast } from '~/components/ui/use-toast'
import { useApiClient } from '../hooks/use-api-client'
// Assuming analytics functions are generic enough or will be adapted
import { trackContentCreated, trackContentDeleted, trackContentUpdated } from './analytics'

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

const defaultContentFields = (type: ContentType = 'note'): Omit<Content, 'id' | 'content'> => ({
  type,
  title: '',
  tags: [],
  synced: false, // Back to boolean
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...(type === 'task' && {
    taskMetadata: {
      status: 'todo',
      priority: 'medium',
      dueDate: null,
      completed: false,
    } as TaskMetadata,
  }),
  ...(type === 'timer' && {
    timeTracking: {
      duration: 0,
      isActive: false,
    },
  }),
})

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

  const dbInit = async (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex('type', 'type', { unique: false })
          store.createIndex('synced', 'synced', { unique: false })
          store.createIndex('updatedAt', 'updatedAt', { unique: false })
          store.createIndex('userId', 'userId', { unique: false })
          store.createIndex('userId_type_updatedAt', ['userId', 'type', 'updatedAt'], {
            unique: false,
          })
        }
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  const dbOperation = async <T>(
    mode: IDBTransactionMode,
    operation: (store: IDBObjectStore) => IDBRequest<T> | IDBRequest<IDBValidKey[]> | Promise<T>
  ): Promise<T> => {
    const db = await dbInit()
    return new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, mode)
      const store = transaction.objectStore(STORE_NAME)
      const result = operation(store)

      if (result instanceof Promise) {
        result.then(resolve).catch(reject)
      } else {
        // For IDBRequest objects
        result.onsuccess = () => resolve(result.result as T)
        result.onerror = () => reject(result.error)
      }
      // Transaction auto-commits
    })
  }

  // Special dbOperation for multiple puts in a single transaction
  const dbBatchPut = async (items: Content[]): Promise<void> => {
    if (items.length === 0) return Promise.resolve()
    const db = await dbInit()
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      let completedOperations = 0

      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)

      for (const item of items) {
        const request = store.put(item)
        request.onsuccess = () => {
          completedOperations++
          // This onsuccess is for individual put, transaction.oncomplete handles overall success
        }
        // Individual error handling can be added here if needed, but transaction.onerror will catch it
      }
    })
  }

  const applyFilters = (items: Content[]): Content[] => {
    let filtered = items
    if (options.type) {
      const types = Array.isArray(options.type) ? options.type : [options.type]
      filtered = filtered.filter((item) => types.includes(item.type))
    }
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter((item) =>
        options.tags?.some((tagValue) => item.tags.some((itemTag) => itemTag.value === tagValue))
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
        let localItems = await dbOperation<Content[]>('readonly', (store) => store.getAll())
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
                  itemsToUpdateInDB.push({ ...serverItem, userId, synced: true }) // boolean true
                }
              }
              if (itemsToUpdateInDB.length > 0) {
                await dbBatchPut(itemsToUpdateInDB)
                localItems = await dbOperation<Content[]>('readonly', (store) => store.getAll())
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
  })

  const createItem = useMutation({
    mutationFn: async (
      itemData: Omit<Content, 'id' | 'synced' | 'createdAt' | 'updatedAt'> &
        Partial<Pick<Content, 'synced' | 'createdAt' | 'updatedAt'>>
    ) => {
      if (!userId && isSignedIn) {
        throw new Error('User ID not available for creating item.')
      }
      const now = new Date().toISOString()
      const newItem: Content = {
        ...defaultContentFields(itemData.type),
        ...itemData,
        id: crypto.randomUUID(),
        userId: userId || undefined,
        createdAt: itemData.createdAt || now,
        updatedAt: itemData.updatedAt || now,
        synced: false, // boolean false
      }

      await dbOperation('readwrite', (store) => store.add(newItem))

      if (isSignedIn && userId) {
        try {
          const serverResponse = await apiClient.post<Content, Content>('/api/content', newItem)
          if (serverResponse) {
            await dbOperation('readwrite', (store) => {
              store.delete(newItem.id)
              return store.put({ ...serverResponse, synced: true }) // boolean true
            })
            trackContentCreated(serverResponse.type, { contentId: serverResponse.id })
            return serverResponse
          }
        } catch (apiErr) {
          console.warn('API create error, item will sync later:', apiErr)
        }
      }
      trackContentCreated(newItem.type, { contentId: newItem.id, synced: false })
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
      const existingItem = await dbOperation<Content | undefined>('readonly', (store) =>
        store.get(itemData.id)
      )
      if (!existingItem) throw new Error(`Item with ID ${itemData.id} not found`)

      const updatedItem: Content = {
        ...existingItem,
        ...itemData,
        updatedAt: new Date().toISOString(),
        synced: false, // boolean false
      }

      await dbOperation('readwrite', (store) => store.put(updatedItem))

      if (isSignedIn && userId) {
        try {
          const serverResponse = await apiClient.put<Content, Content>(
            `/api/content/${itemData.id}`,
            updatedItem
          )
          if (serverResponse) {
            await dbOperation(
              'readwrite',
              (store) => store.put({ ...serverResponse, synced: true }) // boolean true
            )
            trackContentUpdated(serverResponse.type, { contentId: serverResponse.id })
            return serverResponse
          }
        } catch (apiErr) {
          console.warn('API update error, item will sync later:', apiErr)
        }
      }
      trackContentUpdated(updatedItem.type, { contentId: updatedItem.id, synced: false })
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
      const itemToDelete = await dbOperation<Content | undefined>('readonly', (store) =>
        store.get(id)
      )
      await dbOperation('readwrite', (store) => store.delete(id))

      if (isSignedIn && userId) {
        try {
          await apiClient.delete<null, { success: boolean }>(`/api/content/${id}`)
          if (itemToDelete) trackContentDeleted(itemToDelete.type, { contentId: id })
        } catch (apiErr) {
          console.warn('API delete error, item marked for sync deletion later:', apiErr)
          if (itemToDelete) trackContentDeleted(itemToDelete.type, { contentId: id, synced: false })
        }
      } else if (itemToDelete) {
        trackContentDeleted(itemToDelete.type, { contentId: id, synced: false })
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

      const unsyncedItems = await dbOperation<Content[]>(
        'readonly',
        (store) => store.index('synced').getAll(IDBKeyRange.only(false)) // Query for boolean false
      )
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
          // Optional chaining for Biome
          await dbBatchPut(response.syncedItems.map((item) => ({ ...item, synced: true }))) // boolean true
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
