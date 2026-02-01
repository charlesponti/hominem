import { Button } from '@hominem/ui/button';
import { Badge } from '@hominem/ui/components/ui/badge';
import { AlertCircleIcon, LinkIcon } from 'lucide-react';

import type { Account } from '~/lib/types/account.types';

import { AccountConnectionDialog } from './account-connection-dialog';

export function NotConnectedStatus({
  account,
  showDialog,
}: {
  account: Account;
  showDialog?: boolean;
}) {
  return (
    <div className="flex items-center space-x-2">
      <Badge variant="outline" className="text-muted-foreground">
        <AlertCircleIcon className="size-3 mr-1" />
        Not Connected
      </Badge>
      {showDialog && (
        <AccountConnectionDialog
          account={account}
          trigger={
            <Button variant="ghost" size="sm" className="h-6 px-2">
              <LinkIcon className="size-3 mr-1" />
              Connect
            </Button>
          }
        />
      )}
    </div>
  );
}
