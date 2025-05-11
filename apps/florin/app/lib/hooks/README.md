# React Query Hook Implementation Guide

This guide demonstrates the implementation patterns for React Query hooks following the best practices established for the project.

## Core Hook Files Created

1. **Job Application Hooks**: `/apps/florin/app/lib/hooks/useApplications.ts`
   - Basic CRUD operations with improved error handling
   - Standard hook naming patterns (useCreateApplication, useApplications, etc.)

2. **List Management Hooks**: `/apps/florin/app/lib/hooks/use-lists.ts`
   - Complete API for list CRUD operations
   - Additional functionality for invites and permissions

3. **Note Sharing Hooks**: `/apps/florin/app/lib/hooks/use-note-sharing.ts`
   - Demonstration of optimistic updates
   - Error handling with rollback capability

4. **Syncable Tasks Hooks**: `/apps/florin/app/lib/hooks/use-syncable-tasks.ts`
   - Local-first approach with IndexedDB
   - Sync between local storage and server API

5. **Local-First Hook Factory**: `/apps/florin/app/lib/hooks/create-local-first-hook.ts`
   - Reusable hook factory for creating local-first data hooks
   - Type-safe generics for different entity types

6. **Deal Wizard Hooks**: `/apps/florin/app/lib/hooks/use-deals.ts`
   - UI state management combined with API operations
   - Multi-step wizard pattern with validation

## Key Implementation Patterns

### 1. Consistent Structure
All hooks follow a consistent pattern focusing on a single API operation. Each hook returns data, setters, operations, and loading/error states.

```typescript
export function useCreateNote() {
  // ...implementation...
  
  return {
    data,
    setData,
    error,
    isLoading: createNote.isPending,
    isError: createNote.isError,
    createNote,
  }
}
```

### 2. Query Key Management
Query keys are defined as constants at the top of the file using nested arrays for better organization.

```typescript
const NOTES_KEY = [['notes', 'getAll']]
const NOTE_DETAIL_KEY = [['notes', 'detail']]
```

### 3. State Management
Hooks use proper state management via `useState` with appropriate types.

```typescript
// For create operations
const [data, setData] = useState<CreateEntityType>({ /* initial values */ })

// For update operations
const [data, setData] = useState<EntityType | null>(null)
```

### 4. Error Handling
Improved error handling with dedicated error state and proper error capture.

```typescript
const [error, setError] = useState<Error | null>(null)

const mutation = useMutation({
  mutationFn: async (data) => {
    try {
      // API call
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Friendly message'))
      throw err
    }
  },
  onSuccess: () => {
    setError(null)
    // Other success handling
  }
})
```

### 5. Options Customization
Hooks accept options that are merged with sensible defaults.

```typescript
export function useEntityList(options = {}) {
  const defaultOptions = { 
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }

  const query = useQuery({
    // ...query config
    ...defaultOptions,
    ...options
  })
}
```

### 6. Optimistic Updates
Where appropriate, hooks implement optimistic updates with proper rollback on error.

```typescript
onMutate: async (newData) => {
  // Cancel outgoing refetches
  await queryClient.cancelQueries({ queryKey })
  
  // Save current state
  const previousData = queryClient.getQueryData(queryKey)
  
  // Update optimistically
  queryClient.setQueryData(queryKey, /* updated data */)
  
  // Return context for potential rollback
  return { previousData }
},
onError: (err, newData, context) => {
  // Roll back on error
  if (context?.previousData) {
    queryClient.setQueryData(queryKey, context.previousData)
  }
}
```

### 7. Local-First Approach
Hooks that manage offline-capable data implement a local-first approach using IndexedDB and syncing logic.

```typescript
// Store locally first
await dbOperation('readwrite', (store) => store.add(newItem))

// Sync when online
const syncMutation = useMutation({
  mutationFn: async () => {
    // Get unsynced items
    const unsyncedItems = await getUnsyncedItems()
    
    // Send to server
    return await apiClient.post('/api/sync', unsyncedItems)
  }
})
```

## Usage Examples

These hooks can be used in components like this:

```tsx
function CreateEntityForm() {
  const { data, setData, createEntity, isLoading, error } = useCreateEntity()
  
  const handleSubmit = (e) => {
    e.preventDefault()
    createEntity(data)
  }
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      {error && <div className="error">{error.message}</div>}
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Creating...' : 'Create'}
      </button>
    </form>
  )
}
```

## Benefits

These implementation patterns provide several key benefits:

1. **Consistency**: All data operations follow the same patterns, making the codebase more maintainable
2. **Type Safety**: TypeScript types ensure proper data handling
3. **Error Handling**: Comprehensive error states and user feedback
4. **Loading States**: Proper loading indicators for better UX
5. **Caching**: Efficient data caching and invalidation
6. **Optimistic Updates**: Immediate UI feedback with proper rollback mechanisms
7. **Offline Support**: Local-first approach for resilient applications


# Local-First Data Hooks Guide

This guide explains the new consolidated data management hooks that implement the local-first approach consistently throughout the application.

## Key Concepts

1. **Local-First Data Strategy**: Data is stored locally first in IndexedDB, then synced to the server.
2. **Consistent API**: All data hooks expose the same methods and properties.
3. **Type Safety**: Strongly typed with TypeScript for better developer experience.
4. **React Query Integration**: Built on React Query for caching and state management.

## Available Hooks

### 1. useLocalData

This is the base hook that handles all IndexedDB operations and server synchronization. You typically won't use this directly unless you need a one-off custom implementation.

```typescript
const {
  items,                  // Array of items from the collection
  create,                 // Create a new item
  update,                 // Update an existing item
  delete,                 // Delete an item
  getById,                // Get an item by ID
  sync,                   // Sync local changes to the server
  fetchAndMerge,          // Fetch data from server and merge with local
  export,                 // Export all data as JSON
  import,                 // Import data from JSON
  // Async versions
  createAsync,
  updateAsync,
  deleteAsync,
  syncAsync,
  fetchAndMergeAsync,
  importAsync,
  // Status flags
  isLoading,
  isRefetching,
  isFetching,
  isSyncing,
  isCreating,
  isUpdating, 
  isDeleting,
  isImporting,
  // Error state
  error,
  isError,
} = useLocalData<MyEntityType>({
  queryKey: ['my-entity'], 
  endpoint: '/api/my-entity',
  storeName: 'myEntity'
});
```

### 2. createEntityHook

A factory function for creating entity-specific hooks with pre-configured options.

```typescript
// Define your entity type
interface Task extends SyncableEntity {
  title: string;
  completed: boolean;
  dueDate?: string;
}

// Create a hook for this entity type
const useTasks = createEntityHook<Task>({
  entityName: 'tasks',
  endpoint: '/api/tasks',
  storeName: 'tasks',
});

// Use the hook in components
function TaskList() {
  const { items, create, update } = useTasks();
  // ...
}
```

## Migration Guide

Here's how to migrate from existing hooks to the new consolidated hooks:

### From useIndexedDBCollection

```typescript
// Before:
const {
  items,
  create,
  update,
  delete: deleteItem,
  // ...
} = useIndexedDBCollection({
  collectionKey: 'tasks',
  initialData: [],
});

// After:
const {
  items,
  create,
  update,
  delete: deleteItem,
  // ...
} = useLocalData<Task>({
  queryKey: ['tasks'],
  endpoint: '/api/tasks',
  storeName: 'tasks',
});
```

### From useSyncData

```typescript
// Before:
const { syncData, isSyncing } = useSyncData({
  isLoggedIn,
  userId,
  items,
  updateItem,
  endpoint: '/api/tasks',
});

// After:
// The sync functionality is now built into useLocalData
const { sync, isSyncing } = useLocalData<Task>({
  queryKey: ['tasks'],
  endpoint: '/api/tasks',
  storeName: 'tasks',
});
```

### From createLocalFirstHook

```typescript
// Before:
const useNotes = createLocalFirstHook<Note>({
  queryKey: ['notes'],
  endpoint: '/api/notes',
  storeName: 'notes',
});

// After:
// Almost identical, just use createEntityHook instead
const useNotes = createEntityHook<Note>({
  entityName: 'notes',
  endpoint: '/api/notes',
  storeName: 'notes',
});
```

## Best Practices

1. **Define entity interfaces** that extend `SyncableEntity`
2. **Create entity-specific hooks** using `createEntityHook`
3. **Create purpose-specific hooks** for complex operations
4. **Handle loading and error states** in your components
5. **Use optimistic updates** when appropriate

## Example: Creating Entity-Specific Purpose Hooks

```typescript
// Base entity hook
const useTasks = createEntityHook<Task>({
  entityName: 'tasks',
  endpoint: '/api/tasks',
  storeName: 'tasks',
});

// Purpose-specific hook for task completion
export function useTaskCompletion() {
  const { update, items } = useTasks();
  
  const toggleCompletion = (taskId: string) => {
    const task = items.find(t => t.id === taskId);
    if (task) {
      update({ 
        id: taskId, 
        completed: !task.completed 
      });
    }
  };
  
  return { toggleCompletion };
}
```

By following this approach, you ensure consistent data management across your application while maintaining flexibility for specific use cases.
