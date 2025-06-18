import { useAuth } from '~/lib/supabase'
import { useApiClient } from '@hominem/ui'
import type { FinancialInstitution } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'

const FINANCIAL_INSTITUTIONS_KEY = [['financial-institutions']]

export function useFinancialInstitutions() {
  const { userId } = useAuth()
  const apiClient = useApiClient()

  const query = useQuery<FinancialInstitution[]>({
    queryKey: FINANCIAL_INSTITUTIONS_KEY,
    queryFn: async () => {
      return await apiClient.get<null, FinancialInstitution[]>('/api/finance/institutions')
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes - institutions don't change frequently
  })

  return query
}
