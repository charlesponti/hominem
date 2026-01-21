import { Button } from '@hominem/ui/button';
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
} from '@hominem/ui/components/ui/alert-dialog';
import { toast } from '@hominem/ui/components/ui/use-toast';
import { RefreshCcw, Trash2 } from 'lucide-react';

import type { RouterOutput } from '~/lib/trpc';

import { useRemovePlaidConnection, useSyncPlaidItem } from '~/lib/hooks/use-plaid';

import { PlaidStatusBadge } from './plaid-status-badge';

export function PlaidAccountStatus({
  account,
  onRefresh,
}: {
  account: RouterOutput['finance']['accounts']['all']['accounts'][number];
  onRefresh?: () => void;
}) {
  const syncItemMutation = useSyncPlaidItem();
  const removeConnectionMutation = useRemovePlaidConnection();

  const handleSync = async () => {
    if (!account.plaidItemId) return;
    try {
      await syncItemMutation.syncItem.mutateAsync(account.plaidItemId);
      toast({
        title: 'Sync Started',
        description: `Started syncing data for ${account.name}`,
      });
      setTimeout(() => {
        onRefresh?.();
      }, 2000);
    } catch {
      toast({
        title: 'Sync Failed',
        description: 'Failed to start sync. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveConnection = async () => {
    if (!account.plaidItemId) return;
    try {
      await removeConnectionMutation.removeConnection.mutateAsync(account.plaidItemId);
      toast({
        title: 'Connection Removed',
        description: `${account.name} has been disconnected from Plaid.`,
      });
      setTimeout(() => {
        onRefresh?.();
      }, 1000);
    } catch {
      toast({
        title: 'Removal Failed',
        description: 'Failed to remove connection. Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium text-blue-900">Plaid Connection</div>
        <PlaidStatusBadge status={account.plaidItemStatus} />
      </div>
      <div className="space-y-2 text-sm text-blue-700">
        {account.institutionName && <div>Institution: {account.institutionName}</div>}
        {account.plaidLastSyncedAt && (
          <div>
            Last synced:{' '}
            {new Date(account.plaidLastSyncedAt).toLocaleDateString('en-US', {
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
      <div className="flex gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncItemMutation.isLoading || account.plaidItemStatus === 'revoked'}
        >
          {syncItemMutation.isLoading ? (
            <RefreshCcw className="size-4 mr-2 animate-spin" />
          ) : (
            <RefreshCcw className="size-4 mr-2" />
          )}
          Sync Now
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={removeConnectionMutation.isLoading}>
              <Trash2 className="size-4 mr-2" />
              Remove Connection
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Plaid Connection</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove the Plaid connection for {account.name}. The account
                will remain but will no longer sync data from your bank. This action cannot be
                undone.
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
  );
}
