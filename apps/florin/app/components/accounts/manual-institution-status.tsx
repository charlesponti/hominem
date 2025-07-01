import { CheckCircleIcon } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { useAllInstitutions } from '~/lib/hooks/use-institutions'
import { AccountConnectionDialog } from './account-connection-dialog'
import type { RouterOutput } from '~/lib/trpc'

export function ManualInstitutionStatus({
  account,
  showDialog,
}: {
  account: RouterOutput['finance']['accounts']['all']['accounts'][number]
  showDialog?: boolean
}) {
  const institutionsQuery = useAllInstitutions()
  const institution = institutionsQuery.data?.find((inst) => inst.id === account.institutionId)
  return (
    <div className="flex items-center space-x-2">
      <Badge variant="secondary" className="text-green-700 bg-green-50 border-green-200">
        <CheckCircleIcon className="h-3 w-3 mr-1" />
        Connected
      </Badge>
      {institution && <span className="text-sm text-muted-foreground">to {institution.name}</span>}
      {showDialog && (
        <AccountConnectionDialog
          account={account}
          trigger={
            <Button variant="ghost" size="sm" className="h-6 px-2">
              Manage
            </Button>
          }
        />
      )}
    </div>
  )
}
