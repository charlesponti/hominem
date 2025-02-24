import { useDebounce } from '@/hooks/useDebounce'
import { trpc } from '@/lib/trpc'
import { useState } from 'react'

export function useCompanySearch() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const {
    data: companies,
    isFetching,
    isLoading,
  } = trpc.company.search.useQuery(debouncedSearch, {
    queryHash: debouncedSearch,
    enabled: debouncedSearch.length > 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const createMutation = trpc.company.createWithName.useMutation()

  return {
    companies,
    isLoading: isFetching || isLoading,
    search,
    setSearch,
    createCompany: createMutation.mutateAsync,
  }
}
