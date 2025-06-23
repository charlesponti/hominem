import { useApiClient } from '@hominem/ui'
import { useQuery } from '@tanstack/react-query'
import { useSupabaseAuth } from '../supabase/use-auth'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  color?: string
  icon?: string
  createdAt: string
  updatedAt: string
}

/**
 * Hook for fetching finance categories
 * Provides a clean interface for managing budget categories
 */
export function useFinanceCategories() {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({ supabaseClient: supabase })

  // Use React Query to fetch and cache categories
  const query = useQuery<Category[], Error>({
    queryKey: ['finance', 'categories'],
    queryFn: async () => {
      return await apiClient.get<never, Category[]>('/api/finance/categories')
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
