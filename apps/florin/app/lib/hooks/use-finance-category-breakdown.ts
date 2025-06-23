import { useApiClient } from '@hominem/ui'
import type { CategorySummary } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'
import { useSupabaseAuth } from '../supabase/use-auth'

export interface CategoryBreakdown {
  category: string
  amount: number
  percentage: number
  transactionCount: number
}

export function useFinanceCategoryBreakdown({
  from,
  to,
  account,
  limit,
}: {
  from?: string
  to?: string
  account?: string
  limit?: number
}) {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({ supabaseClient: supabase })
  return useQuery<CategorySummary[]>({
    queryKey: ['finance', 'categoryBreakdown', { from, to, account, limit }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      if (account) params.append('account', account)
      if (limit) params.append('limit', String(limit))
      return await apiClient.get(`/api/finance/analyze/category-breakdown?${params.toString()}`)
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}
