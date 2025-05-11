import type { SyncableEntity } from './use-local-data'
import { useLocalData } from './use-local-data'

/**
 * Create a typed hook for a specific entity
 * This factory function creates a custom hook with predefined configuration
 * for a specific entity type.
 */
export function createEntityHook<T extends SyncableEntity>({
  entityName,
  endpoint,
  storeName,
}: {
  entityName: string
  endpoint: string
  storeName: string
}) {
  // Return a custom hook that uses the useLocalData hook with specific configuration
  return function useEntity(options = {}) {
    return useLocalData<T>({
      queryKey: [entityName],
      endpoint,
      storeName,
      ...options,
    })
  }
}

// Example usage:
// interface Task extends SyncableEntity {
//   title: string
//   description: string
//   completed: boolean
//   dueDate?: string
// }
//
// export const useTasks = createEntityHook<Task>({
//   entityName: 'tasks',
//   endpoint: '/api/tasks',
//   storeName: 'tasks',
// })
