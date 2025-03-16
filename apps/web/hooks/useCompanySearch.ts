import { useDebounce } from '@/hooks/useDebounce'
import { useApiClient } from '@/lib/hooks/use-api-client'
import type { Company } from '@ponti/utils/schema'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useState } from 'react'

export function useCompanySearch() {
  const apiClient = useApiClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const {
    data: companies,
    isFetching,
    isLoading,
  } = useQuery({
    queryHash: debouncedSearch,
    queryFn: () =>
      apiClient.get<{ search: string }, Company[]>(`/api/companies?search=${debouncedSearch}`),
    enabled: debouncedSearch.length > 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const createMutation = useMutation({
    mutationFn: (companyName: string) =>
      apiClient.post<{ name: string }, Company>('/api/companies', {
        name: companyName,
      }),
  })

  return {
    companies,
    isLoading: isFetching || isLoading,
    search,
    setSearch,
    createCompany: createMutation.mutateAsync,
  }
}
