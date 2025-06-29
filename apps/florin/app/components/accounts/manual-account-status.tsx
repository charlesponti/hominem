import { Button } from '~/components/ui/button'
import { trpc, type RouterOutput } from '~/lib/trpc'
import { AccountConnectionDialog } from './account-connection-dialog'

interface ManualAccountStatusProps {
  account: RouterOutput['finance']['accounts']['all']['accounts'][number]
}

export function ManualAccountStatus({ account }: ManualAccountStatusProps) {
  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-gray-900">Manual Account</div>
          <div className="text-sm text-gray-600">
            This account is not connected to any financial institution.
          </div>
        </div>
        <AccountConnectionDialog
          account={account}
          trigger={
            <Button variant="default" size="sm">
              Connect to Institution
            </Button>
          }
        />
      </div>
    </div>
  )
} 
