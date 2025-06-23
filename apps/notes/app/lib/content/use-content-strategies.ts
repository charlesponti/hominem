import { useApiClient } from '@hominem/ui'
import type { ContentStrategiesSelect, ContentStrategy } from '@hominem/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useSupabaseAuth } from '../supabase/use-auth'

// Query keys
const CONTENT_STRATEGIES_KEY = [['content-strategies']]

// Type for creating a new content strategy
type CreateContentStrategyData = {
  title: string
  description?: string
  strategy: ContentStrategy
}

// Type for updating a content strategy
type UpdateContentStrategyData = {
  id: string
  title?: string
  description?: string
  strategy?: ContentStrategy
}

/**
 * Hook to fetch all content strategies for the current user
 */
export function useContentStrategies() {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })

  const query = useQuery<ContentStrategiesSelect[]>({
    queryKey: CONTENT_STRATEGIES_KEY,
    queryFn: async () => {
      // Let the API handle authentication - don't check user here
      return await apiClient.get<null, ContentStrategiesSelect[]>('/api/content-strategies')
    },
  })

  return {
    strategies: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    count: query.data?.length || 0,
  }
}

/**
 * Hook to fetch a specific content strategy by ID
 */
export function useContentStrategy(strategyId: string) {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })

  const query = useQuery<ContentStrategiesSelect>({
    queryKey: [['content-strategies', strategyId]],
    queryFn: async () => {
      // Let the API handle authentication - don't check user here
      return await apiClient.get<null, ContentStrategiesSelect>(
        `/api/content-strategies/${strategyId}`
      )
    },
    enabled: !!strategyId,
  })

  return {
    strategy: query.data || null,
    isLoading: query.isLoading,
    error: query.error,
    found: !!query.data,
  }
}

/**
 * Hook to create a new content strategy
 */
export function useCreateContentStrategy() {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })
  const queryClient = useQueryClient()
  const [data, setData] = useState<CreateContentStrategyData>({
    title: '',
    description: '',
    strategy: {} as ContentStrategy,
  })

  const createStrategy = useMutation({
    mutationFn: async (strategyData: CreateContentStrategyData) => {
      // Let the API handle authentication - don't check user here
      return await apiClient.post<CreateContentStrategyData, ContentStrategiesSelect>(
        '/api/content-strategies',
        strategyData
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_STRATEGIES_KEY })
      // Reset form data
      setData({
        title: '',
        description: '',
        strategy: {} as ContentStrategy,
      })
    },
  })

  return {
    data,
    setData,
    isLoading: createStrategy.isLoading,
    isError: createStrategy.isError,
    error: createStrategy.error,
    createStrategy,
  }
}

/**
 * Hook to update an existing content strategy
 */
export function useUpdateContentStrategy() {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })
  const queryClient = useQueryClient()
  const [data, setData] = useState<ContentStrategy | null>(null)

  const updateStrategy = useMutation({
    mutationFn: async (updateData: UpdateContentStrategyData) => {
      // Let the API handle authentication - don't check user here
      return await apiClient.put<Omit<UpdateContentStrategyData, 'id'>, ContentStrategiesSelect>(
        `/api/content-strategies/${updateData.id}`,
        {
          title: updateData.title,
          description: updateData.description,
          strategy: updateData.strategy,
        }
      )
    },
    onSuccess: (updatedStrategy) => {
      queryClient.invalidateQueries({ queryKey: CONTENT_STRATEGIES_KEY })
      queryClient.invalidateQueries({ queryKey: [['content-strategies', updatedStrategy.id]] })
    },
  })

  return {
    data,
    setData,
    isLoading: updateStrategy.isLoading,
    isError: updateStrategy.isError,
    error: updateStrategy.error,
    updateStrategy,
  }
}

/**
 * Hook to delete a content strategy
 */
export function useDeleteContentStrategy() {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })
  const queryClient = useQueryClient()

  const deleteStrategy = useMutation({
    mutationFn: async (strategyId: string) => {
      // Let the API handle authentication - don't check user here
      await apiClient.delete<null, void>(`/api/content-strategies/${strategyId}`)
      return strategyId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONTENT_STRATEGIES_KEY })
    },
  })

  return {
    isLoading: deleteStrategy.isLoading,
    isError: deleteStrategy.isError,
    error: deleteStrategy.error,
    deleteStrategy,
  }
}
