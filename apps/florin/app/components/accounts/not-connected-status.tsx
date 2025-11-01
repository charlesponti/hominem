import { AlertCircleIcon, LinkIcon } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import type { RouterOutput } from '~/lib/trpc'
import { AccountConnectionDialog } from './account-connection-dialog'

export function NotConnectedStatus({
  account,
  showDialog,
}: {
  account: RouterOutput['finance']['accounts']['all']['accounts'][number]
  showDialog?: boolean
}) {
  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="text-muted-foreground">
        <AlertCircleIcon className="h-3 w-3 mr-1" />
        Not Connected
      </Badge>
      {showDialog && (
        <AccountConnectionDialog
          account={account}
          trigger={
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <LinkIcon className="h-3 w-3 mr-1" />
              Connect
            </Button>
          }
        />
      )}
    </div>
  )
}
