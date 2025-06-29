import { AlertTriangle, CheckCircle, Clock, RefreshCcw, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '~/components/ui/alert-dialog'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { toast } from '~/components/ui/use-toast'
import { useRemovePlaidConnection, useSyncPlaidItem } from '~/lib/hooks/use-plaid'

interface PlaidConnectionStatusProps {
  account: {
    id: string
    name: string
    plaidItemId: string | null
    plaidItemStatus: string | null
    plaidItemError: string | null
    plaidLastSyncedAt: string | null
    institutionName: string | null
  }
  onRefresh?: () => void
}

export function PlaidConnectionStatus({ account, onRefresh }: PlaidConnectionStatusProps) {
  const syncItemMutation = useSyncPlaidItem()
  const removeConnectionMutation = useRemovePlaidConnection()

  const getPlaidStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        )
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Error
          </Badge>
        )
      case 'pending_expiration':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="w-3 h-3 mr-1" />
            Expiring Soon
          </Badge>
        )
      case 'revoked':
        return (
          <Badge variant="outline" className="text-gray-600">
            Revoked
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const handleSync = async () => {
    if (!account.plaidItemId) return

    try {
      await syncItemMutation.mutateAsync({ itemId: account.plaidItemId })
      toast({
        title: 'Sync Started',
        description: `Started syncing data for ${account.name}`,
      })
      // Refresh data after sync
      setTimeout(() => {
        onRefresh?.()
      }, 2000)
    } catch (error) {
      toast({
        title: 'Sync Failed',
        description: 'Failed to start sync. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleRemoveConnection = async () => {
    if (!account.plaidItemId) return

    try {
      await removeConnectionMutation.mutateAsync({ itemId: account.plaidItemId })
      toast({
        title: 'Connection Removed',
        description: `${account.name} has been disconnected from Plaid.`,
      })
      // Refresh data after removal
      setTimeout(() => {
        onRefresh?.()
      }, 1000)
    } catch (error) {
      toast({
        title: 'Removal Failed',
        description: 'Failed to remove connection. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (!account.plaidItemId) {
    return null
  }

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium text-blue-900">Plaid Connection</div>
        {getPlaidStatusBadge(account.plaidItemStatus)}
      </div>
      
      <div className="space-y-2 text-sm text-blue-700">
        {account.institutionName && (
          <div>Institution: {account.institutionName}</div>
        )}
        {account.plaidLastSyncedAt && (
          <div>
            Last synced: {new Date(account.plaidLastSyncedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
        {account.plaidItemError && (
          <div className="text-red-600">Error: {account.plaidItemError}</div>
        )}
      </div>

      {/* Plaid Actions */}
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncItemMutation.isPending || account.plaidItemStatus === 'revoked'}
        >
          {syncItemMutation.isPending ? (
            <RefreshCcw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCcw className="w-4 h-4 mr-2" />
          )}
          Sync Now
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={removeConnectionMutation.isPending}>
              <Trash2 className="w-4 h-4 mr-2" />
              Remove Connection
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Plaid Connection</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the Plaid connection for {account.name}. 
                The account will remain but will no longer sync data from your bank. 
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRemoveConnection}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove Connection
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
} 
