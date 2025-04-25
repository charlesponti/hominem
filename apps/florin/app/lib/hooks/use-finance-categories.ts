import { useQuery } from '@tanstack/react-query'
import { useApiClient } from '~/lib/hooks/use-api-client'

interface Category {
  category: string
}

/**
 * Custom hook to fetch finance categories using React Query
 */
export function useFinanceCategories() {
  const apiClient = useApiClient()

  // Use React Query to fetch and cache categories
  const query = useQuery<string[], Error>({
    queryKey: ['financeCategories'],
    queryFn: async () => {
      try {
        const response = await apiClient.get<never, Category[]>('/api/finance/analyze/categories')
        return response
          .map((item) => item.category)
          .filter(Boolean)
          .sort((a, b) => a.localeCompare(b))
      } catch (error) {
        console.error('Error fetching categories:', error)
        throw error instanceof Error ? error : new Error('Failed to fetch categories')
      }
    },
    staleTime: 60 * 60 * 1000, // 1 hour
  })

  return {
    categories: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
