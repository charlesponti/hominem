'use client'

import { trpc } from '~/lib/trpc'

// Export tRPC hook directly since there's already a tRPC endpoint for this
export const usePlaidAccountsByInstitution = (institutionId: string | null) =>
  trpc.finance.institutions.institutionAccounts.useQuery(
    { institutionId: institutionId || '' },
    { enabled: !!institutionId }
  )
