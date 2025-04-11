# Hook Development Guidelines for React Query

## Core Patterns to Follow

### 1. Consistent Structure

- Each hook should focus on a single API operation (create, read, update, delete)
- Return consistent data structures: `{ data, setData, operation }` where operation is the mutation or query

### 2. State Management

- Use `useState` for managing local form/input data
- Initialize state with appropriate types and default values
- For creation hooks: `useState<InsertType>()`
- For update hooks: `useState<EntityType | null>(null)`

### 3. Query Key Management

- Define query keys at the top of the file as constants
- Use nested arrays for better organization: `[['entity', 'operation']]`
- Maintain consistent key structure across related operations

### 4. Mutation Structure

- Implement mutations with `useMutation` from React Query
- Include both `mutationFn` and `onSuccess` handlers
- Always invalidate related queries on successful operations
- Follow RESTful patterns in API calls

### 5. Type Safety

- Use TypeScript types consistently across all hooks
- Define reusable utility types like `PartialWithId<T>` for common patterns
- Import types from shared schema definitions (e.g., `@hominem/utils/schema`)

## Recommended Improvements

### 1. Error Handling

```typescript
// Add error handling and status management
export function useUpdateApplication() {
  const queryClient = useQueryClient()
  const [data, setData] = useState<JobApplication | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const updateApplication = useMutation({
    mutationFn: async (data: PartialWithId<JobApplication>) => {
      try {
        const response = await fetch(`/api/applications/${data.id}`, {
          method: 'PUT',
          body: JSON.stringify(data),
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`)
        }
        
        return response.json()
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'))
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
    updateApplication,
  }
}
```

### 2. Loading State Exposure

```typescript
// Expose loading state for better UX handling
export function useCreateApplication() {
  // ...existing code...
  
  return {
    data,
    setData,
    isLoading: createApplication.isPending,
    isError: createApplication.isError,
    error: createApplication.error,
    createApplication,
  }
}
```

### 3. Authentication Integration

```typescript
// Centralize auth token handling
const useAuthHeaders = () => {
  const { userId, getToken } = useAuth()
  
  const getAuthHeaders = async () => {
    const token = await getToken()
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token || userId}`,
    }
  }
  
  return { getAuthHeaders, userId }
}
```

### 4. Options Customization

```typescript
export function useApplications(options = {}) {
  const { userId } = useAuth()
  const defaultOptions = { 
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  }

  const query = useQuery<JobApplication[]>({
    queryKey: APPLICATIONS_KEY,
    queryFn: async () => {
      // ...existing implementation...
    },
    ...defaultOptions,
    ...options
  })

  return query
}
```

### 5. Request Abstraction

Consider creating a shared API client for consistent request handling:

```typescript
// apiClient.ts
export const apiClient = {
  get: async (url: string, headers = {}) => {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    })
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }
    
    return response.json()
  },
  
  post: async (url: string, data: any, headers = {}) => {
    // Similar implementation...
  },
  
  // Additional methods for PUT, DELETE, etc.
}
```

By following these guidelines and implementing the suggested improvements, you'll ensure more robust, maintainable, and consistent hook patterns throughout your application.
