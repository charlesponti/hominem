import { trpc } from '~/lib/trpc'

// Export tRPC hook directly since this was just a wrapper
export const useFinancialInstitutions = () => trpc.finance.institutions.list.useQuery()
