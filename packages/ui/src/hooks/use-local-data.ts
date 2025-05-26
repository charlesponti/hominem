/**
 * Example usage:
 * const useNotes = () => useLocalData<Note>({
 *   queryKey: ['notes'],
 *   endpoint: '/api/notes',
 *   storeName: 'notes',
 * })
 */
import { useAuth } from '@clerk/react-router'
import { useApiClient } from '@hominem/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

// Base entity interface that all entities should implement
export interface Entity {
  id: string
  updatedAt: string
  createdAt: string
}

// Base syncable entity that extends the Entity interface with sync status
export interface SyncableEntity extends Entity {
  synced: boolean
  userId?: string | null
}

// Type for partial updates with ID
export type PartialWithId<T> = Partial<T> & { id: string }

interface DBInstance {
  db: IDBDatabase | null
  isInitialized: boolean
}

export interface UseLocalDataOptions {
  /** The key to use for React Query cache */
  queryKey: string[]
  /** The endpoint for API operations */
  endpoint: string
  /** The name of the IndexedDB store */
  storeName: string
  /** The name of the IndexedDB database */
  dbName?: string
  /** The version of the IndexedDB database */
  version?: number
  /** Initial data to use when database is empty */
  initialData?: SyncableEntity[]
  /** Stale time for React Query in milliseconds */
  staleTime?: number
  /** Default query options */
  queryOptions?: Record<string, unknown>
  /** Optional callback to set up custom indices on the store */
  setupStore?: (store: IDBObjectStore) => void
}

// Shared DB instance map for multi-store/multi-db support
const dbInstances: Record<string, DBInstance> = {}

export function initDB({
  dbName,
  version,
  storeName,
  setupStore,
}: {
  dbName: string
  version: number
  storeName: string
  setupStore?: (store: IDBObjectStore) => void
}): Promise<IDBDatabase> {
  const dbKey = `${dbName}::${storeName}`
  if (!dbInstances[dbKey]) dbInstances[dbKey] = { db: null, isInitialized: false }
  const dbInstance = dbInstances[dbKey]
  return new Promise((resolve, reject) => {
    if (dbInstance.isInitialized && dbInstance.db) {
      resolve(dbInstance.db)
      return
    }
    const request = indexedDB.open(dbName, version)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      dbInstance.db = request.result
      dbInstance.isInitialized = true
      resolve(request.result)
    }
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(storeName)) {
        const store = db.createObjectStore(storeName, { keyPath: 'id' })
        store.createIndex('synced', 'synced', { unique: false })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
        if (setupStore) setupStore(store)
      }
    }
  })
}

export function dbOperation<R>({
  dbName,
  version,
  storeName,
  setupStore,
  mode,
  operation,
}: {
  dbName: string
  version: number
  storeName: string
  setupStore?: (store: IDBObjectStore) => void
  mode: IDBTransactionMode
  operation: (store: IDBObjectStore) => IDBRequest<R>
}): Promise<R> {
  return initDB({ dbName, version, storeName, setupStore }).then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode)
        const store = transaction.objectStore(storeName)
        const request = operation(store)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
  )
}

/**
 * A hook for managing local-first data with IndexedDB storage and server synchronization
 */
export function useLocalData<T extends SyncableEntity>({
  queryKey,
  endpoint,
  storeName,
  dbName = 'AppDatabase',
  version = 1,
  initialData = [],
  staleTime = 5 * 60 * 1000, // 5 minutes by default
  queryOptions = {},
  setupStore,
}: UseLocalDataOptions) {
  const { userId, isSignedIn } = useAuth()
  const queryClient = useQueryClient()
  const apiClient = useApiClient()
  const [error, setError] = useState<Error | null>(null)

  // Get all items from the collection
  const getAll = async (): Promise<T[]> => {
    try {
      return await dbOperation<T[]>({
        dbName,
        version,
        storeName,
        setupStore,
        mode: 'readonly',
        operation: (store) => store.getAll(),
      })
    } catch (err) {
      console.error(`Error reading from IndexedDB (${storeName}):`, err)
      setError(err instanceof Error ? err : new Error(`Failed to fetch ${storeName}`))
      return initialData as T[]
    }
  }

  // Query for fetching all items
  const query = useQuery({
    queryKey,
    queryFn: getAll,
    staleTime,
    ...queryOptions,
  })

  // Mutation for creating items
  const createMutation = useMutation({
    mutationFn: async (newItem: Omit<T, 'id' | 'synced' | 'createdAt' | 'updatedAt'>) => {
      try {
        const now = new Date().toISOString()
        const item = {
          ...newItem,
          id: crypto.randomUUID(),
          synced: false,
          createdAt: now,
          updatedAt: now,
          userId,
        } as T

        await dbOperation({
          dbName,
          version,
          storeName,
          setupStore,
          mode: 'readwrite',
          operation: (store) => store.add(item),
        })
        return item
      } catch (err) {
        setError(err instanceof Error ? err : new Error(`Failed to create ${storeName}`))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setError(null)
    },
  })

  // Mutation for updating items
  const updateMutation = useMutation({
    mutationFn: async (data: PartialWithId<T>) => {
      try {
        // First get the existing item
        const existingItem = await dbOperation<T>({
          dbName,
          version,
          storeName,
          setupStore,
          mode: 'readonly',
          operation: (store) => store.get(data.id),
        })

        if (!existingItem) {
          throw new Error(`${storeName} with ID ${data.id} not found`)
        }

        const updatedItem: T = {
          ...existingItem,
          ...data,
          updatedAt: new Date().toISOString(),
          synced: false,
        }

        await dbOperation({
          dbName,
          version,
          storeName,
          setupStore,
          mode: 'readwrite',
          operation: (store) => store.put(updatedItem),
        })
        return updatedItem
      } catch (err) {
        setError(err instanceof Error ? err : new Error(`Failed to update ${storeName}`))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setError(null)
    },
  })

  // Mutation for deleting items
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      try {
        await dbOperation({
          dbName,
          version,
          storeName,
          setupStore,
          mode: 'readwrite',
          operation: (store) => store.delete(id),
        })
        return id
      } catch (err) {
        setError(err instanceof Error ? err : new Error(`Failed to delete ${storeName}`))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setError(null)
    },
  })

  // Sync data with server
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!isSignedIn || !userId) {
        throw new Error('User not authenticated')
      }

      try {
        // Get all unsynced items
        const unsyncedItems = await dbOperation<T[]>({
          dbName,
          version,
          storeName,
          setupStore,
          mode: 'readonly',
          operation: (store) => {
            const index = store.index('synced')
            return index.getAll()
          },
        })

        if (unsyncedItems.length === 0) {
          return { message: `No ${storeName} to sync` }
        }

        // Send unsynced items to the server
        const response = await apiClient.post(`${endpoint}/sync`, unsyncedItems)

        // Update synced status in local database
        if (response && Array.isArray(response)) {
          await Promise.all(
            response.map((item) =>
              dbOperation({
                dbName,
                version,
                storeName,
                setupStore,
                mode: 'readwrite',
                operation: (store) => store.put({ ...item, synced: true }),
              })
            )
          )
        }

        return response
      } catch (err) {
        console.error(`Error syncing ${storeName}:`, err)
        setError(err instanceof Error ? err : new Error(`Failed to sync ${storeName}`))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setError(null)
    },
  })

  // Fetch from server and merge with local
  const fetchAndMergeMutation = useMutation({
    mutationFn: async () => {
      if (!isSignedIn || !userId) {
        throw new Error('User not authenticated')
      }

      try {
        // Fetch items from server
        const serverItems = await apiClient.get<null, T[]>(endpoint)

        // Get all local items
        const localItems = await dbOperation<T[]>({
          dbName,
          version,
          storeName,
          setupStore,
          mode: 'readonly',
          operation: (store) => store.getAll(),
        })

        // Create a map of local items for quick lookup
        const localItemsMap = new Map(localItems.map((item) => [item.id, item]))

        // Merge server items with local items
        const itemsToUpdate: T[] = []

        for (const serverItem of serverItems) {
          const localItem = localItemsMap.get(serverItem.id)

          if (!localItem) {
            // Item exists on server but not locally - add it
            itemsToUpdate.push({ ...serverItem, synced: true })
          } else if (new Date(serverItem.updatedAt) > new Date(localItem.updatedAt)) {
            // Server item is newer - update local
            itemsToUpdate.push({ ...serverItem, synced: true })
          } else if (
            new Date(serverItem.updatedAt) < new Date(localItem.updatedAt) &&
            !localItem.synced
          ) {
            // Local item is newer and not synced - keep it for later sync
            // biome-ignore lint/correctness/noUnnecessaryContinue: <explanation>
            continue
          }
        }

        // Update local database with merged items
        for (const item of itemsToUpdate) {
          await dbOperation({
            dbName,
            version,
            storeName,
            setupStore,
            mode: 'readwrite',
            operation: (store) => store.put(item),
          })
        }

        return { updated: itemsToUpdate.length }
      } catch (err) {
        console.error(`Error fetching ${storeName} from server:`, err)
        setError(err instanceof Error ? err : new Error(`Failed to fetch ${storeName} from server`))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setError(null)
    },
  })

  // Export data
  const exportData = async (): Promise<string> => {
    try {
      const allData = await getAll()
      const exportObject = {
        storeName,
        timestamp: new Date().toISOString(),
        data: allData,
      }
      return JSON.stringify(exportObject, null, 2)
    } catch (err) {
      console.error(`Error exporting ${storeName} data:`, err)
      setError(err instanceof Error ? err : new Error(`Failed to export ${storeName} data`))
      throw err
    }
  }

  // Import data
  const importMutation = useMutation({
    mutationFn: async (importData: T[]) => {
      try {
        await dbOperation({
          dbName,
          version,
          storeName,
          setupStore,
          mode: 'readwrite',
          operation: (store) => {
            // Clear existing data
            store.clear()

            // Add all imported items
            for (const item of importData) {
              store.add(item)
            }

            return store.count()
          },
        })
        return importData
      } catch (err) {
        console.error(`Error importing ${storeName} data:`, err)
        setError(err instanceof Error ? err : new Error(`Failed to import ${storeName} data`))
        throw err
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      setError(null)
    },
  })

  // Get a specific item by ID
  const getById = async (id: string): Promise<T | null> => {
    try {
      return await dbOperation({
        dbName,
        version,
        storeName,
        setupStore,
        mode: 'readonly',
        operation: (store) => store.get(id),
      })
    } catch (err) {
      console.error(`Error getting ${storeName} by ID:`, err)
      setError(err instanceof Error ? err : new Error(`Failed to get ${storeName} by ID`))
      return null
    }
  }

  // Return the complete API
  return {
    // Data
    items: query.data || [],

    // Basic CRUD operations
    create: createMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    getById,

    // Sync operations
    sync: syncMutation.mutate,
    fetchAndMerge: fetchAndMergeMutation.mutate,

    // Import/Export
    export: exportData,
    import: importMutation.mutate,

    // Async versions of methods
    createAsync: createMutation.mutateAsync,
    updateAsync: updateMutation.mutateAsync,
    deleteAsync: deleteMutation.mutateAsync,
    syncAsync: syncMutation.mutateAsync,
    fetchAndMergeAsync: fetchAndMergeMutation.mutateAsync,
    importAsync: importMutation.mutateAsync,

    // Status flags
    isLoading: query.isLoading,
    isRefetching: query.isRefetching,
    isFetching: query.isFetching,
    isSyncing: syncMutation.isPending,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isImporting: importMutation.isPending,

    // Error state
    error,
    isError: !!error,
  }
}
