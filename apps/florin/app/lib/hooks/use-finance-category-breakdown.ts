import { useApiClient } from '@hominem/ui'
import type { CategorySummary } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'

export function useFinanceCategoryBreakdown({
  from,
  to,
  account,
  limit = 5,
}: {
  from?: string
  to?: string
  account?: string
  limit?: number
}) {
  const apiClient = useApiClient()
  return useQuery<CategorySummary[]>({
    queryKey: ['finance', 'categoryBreakdown', { from, to, account, limit }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      if (account) params.append('account', account)
      params.append('limit', String(limit))
      return await apiClient.get(`/api/finance/analyze/category-breakdown?${params.toString()}`)
    },
    staleTime: 5 * 60 * 1000,
  })
}
