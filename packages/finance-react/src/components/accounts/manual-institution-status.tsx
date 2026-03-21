import { Badge } from '@hominem/ui/components/ui/badge'
import { CheckCircleIcon } from 'lucide-react'

import type { AccountWithPlaidInfo } from '@hominem/rpc/types/finance.types'

import { useAllInstitutions } from '../../hooks/use-institutions'

interface ManualInstitutionStatusProps {
  account: AccountWithPlaidInfo
}

export function ManualInstitutionStatus({ account }: ManualInstitutionStatusProps) {
  const institutionsQuery = useAllInstitutions()
  const institution = Array.isArray(institutionsQuery.data)
    ? institutionsQuery.data.find((inst) => inst.name === account.institutionName)
    : undefined

  return (
    <div className="flex items-center space-x-2">
      <Badge variant="secondary" className="text-foreground border border-foreground">
        <CheckCircleIcon className="size-3 mr-1" />
        Connected
      </Badge>
      {institution && <span className="text-sm text-muted-foreground">to {institution.name}</span>}
    </div>
  )
}
