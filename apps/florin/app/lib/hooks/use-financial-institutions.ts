import { useApiClient } from '@hominem/ui'
import type { FinancialInstitution } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

const FINANCIAL_INSTITUTIONS_KEY = [['financial-institutions']]

export function useFinancialInstitutions() {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient()

  const query = useQuery<FinancialInstitution[]>({
    queryKey: FINANCIAL_INSTITUTIONS_KEY,
    queryFn: async () => {
      // Check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      return await apiClient.get<null, FinancialInstitution[]>('/api/finance/institutions')
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - institutions don't change frequently
  })

  return query
}
