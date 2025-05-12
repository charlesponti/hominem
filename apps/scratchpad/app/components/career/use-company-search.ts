import { useApiClient, useDebounce } from '@hominem/ui'
import type { Company } from '@hominem/utils/types'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

export function useCompanySearch() {
  const apiClient = useApiClient()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data: companies, isFetching } = useQuery({
    queryKey: [debouncedSearch],
    queryFn: () => {
      const query = new URLSearchParams({ query: debouncedSearch })
      return apiClient.get<{ search: string }, Company[]>(
        `/api/companies/search?${query.toString()}`
      )
    },
    enabled: debouncedSearch.length > 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const createMutation = useMutation({
    mutationFn: (companyName: string) => {
      return apiClient.post<{ name: string }, Company>('/api/companies', {
        name: companyName,
      })
    },
    onSuccess: (data) => {
      // Add the company to the cache
      queryClient.setQueryData([debouncedSearch], (oldData: Company[] | undefined) => {
        return oldData ? [...oldData, data] : [data]
      })
      return data
    },
    onError: (error) => {
      console.error('Error creating company:', error)
    },
  })

  return {
    companies,
    isLoading: isFetching,
    search,
    setSearch,
    createCompany: createMutation.mutateAsync,
  }
}
