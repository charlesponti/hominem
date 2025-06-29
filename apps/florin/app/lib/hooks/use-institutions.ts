import { useQueryClient } from '@tanstack/react-query'
import { trpc } from '~/lib/trpc'

/**
 * Hook for creating a new institution with automatic cache invalidation
 */
export function useCreateInstitution() {
  const queryClient = useQueryClient()
  const mutation = trpc.finance.institutionsNew.create.useMutation({
    onSuccess: () => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['finance', 'institutionsNew', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['finance', 'institutionsNew', 'connections'] })
    },
  })

  return {
    createInstitution: mutation.mutate,
    isLoading: mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
    data: mutation.data,
  }
}

/**
 * Hook for getting accounts grouped by institution
 * This adds value by transforming the data structure
 */
export function useAccountsByInstitution() {
  const { data: accounts = [], isLoading, isError, error, refetch } = 
    trpc.finance.institutionsNew.accounts.useQuery()

  const accountsByInstitution = accounts.reduce((acc: Record<string, { 
    institutionId: string; 
    institutionName: string; 
    institutionLogo: string | null; 
    accounts: any[] 
  }>, account: any) => {
    const institutionId = account.institutionId || 'unlinked'
    const institutionName = account.institutionName || 'Unlinked Accounts'
    
    if (!acc[institutionId]) {
      acc[institutionId] = {
        institutionId,
        institutionName,
        institutionLogo: account.institutionLogo,
        accounts: [],
      }
    }
    
    acc[institutionId].accounts.push(account)
    return acc
  }, {})

  return {
    accountsByInstitution,
    isLoading,
    isError,
    error,
    refetch,
  }
}

// Export tRPC hooks directly for simple queries
export const useInstitutionConnections = () => trpc.finance.institutionsNew.connections.useQuery()
export const useInstitutionAccounts = () => trpc.finance.institutionsNew.accounts.useQuery()
export const useInstitutionAccountsByInstitution = (institutionId: string) => 
  trpc.finance.institutionsNew.institutionAccounts.useQuery(
    { institutionId },
    { enabled: !!institutionId }
  )
export const useInstitution = (institutionId: string) => 
  trpc.finance.institutionsNew.get.useQuery(
    { institutionId },
    { enabled: !!institutionId }
  )
export const useAllInstitutions = () => trpc.finance.institutionsNew.list.useQuery() 
