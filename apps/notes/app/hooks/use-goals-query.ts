import { useApiClient } from '@hominem/ui'
import { useQuery } from '@tanstack/react-query'

import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export function useGoalsQuery() {
  const { supabase } = useSupabaseAuth()
  const apiClient = useApiClient({
    apiUrl: import.meta.env.VITE_PUBLIC_API_URL,
    supabaseClient: supabase,
  })
  return useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const data = await apiClient.get<null, { goals: unknown[] }>('/api/goals')
      return Array.isArray(data?.goals) ? data.goals : []
    },
  })
}
