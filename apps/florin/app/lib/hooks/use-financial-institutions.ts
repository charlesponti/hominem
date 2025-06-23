import { useApiClient } from '@hominem/ui'
import type { FinancialInstitution } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'
import { useSupabaseAuth } from '../supabase/use-auth'

const FINANCIAL_INSTITUTIONS_KEY = [['financial-institutions']]

export function useFinancialInstitutions() {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({ supabaseClient: supabase })

  const query = useQuery<FinancialInstitution[]>({
    queryKey: FINANCIAL_INSTITUTIONS_KEY,
    queryFn: async () => {
      return await apiClient.get<never, FinancialInstitution[]>('/api/finance/institutions')
    },
    staleTime: 60 * 60 * 1000, // 1 hour - institutions don't change often
  })

  return {
    institutions: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  }
}
