import type { TopMerchant } from '@hominem/utils/types'
import { useQuery } from '@tanstack/react-query'
import { useApiClient } from './use-api-client'

export function useFinanceTopMerchants({
  from,
  to,
  account,
  category,
  limit = 5,
}: {
  from?: string
  to?: string
  account?: string
  category?: string
  limit?: number
}) {
  const apiClient = useApiClient()
  return useQuery<TopMerchant[]>({
    queryKey: ['finance', 'topMerchants', { from, to, account, category, limit }],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (from) params.append('from', from)
      if (to) params.append('to', to)
      if (account) params.append('account', account)
      if (category) params.append('category', category)
      params.append('limit', String(limit))
      return await apiClient.get(`/api/finance/analyze/top-merchants?${params.toString()}`)
    },
    staleTime: 5 * 60 * 1000,
  })
}
