import { trpc } from '~/lib/trpc'

export function useFinancialInstitutions() {
  const {
    data: institutions = [],
    isLoading,
    error,
    refetch,
  } = trpc.finance.institutions.list.useQuery()

  return {
    institutions: institutions || [],
    isLoading,
    error,
    refetch,
  }
}
