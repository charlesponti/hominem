import { Badge } from '@ponti-studios/ui/primitives';
import { Button } from '@ponti-studios/ui/primitives';
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
      <Badge variant="outline">
        <AlertCircleIcon className="size-3 mr-1" />
        Not Connected
      </Badge>
      {showDialog && (
        <AccountConnectionDialog
          account={account}
          trigger={
            <Button variant="ghost" size="sm">
              <LinkIcon className="size-3 mr-1" />
              Connect
            </Button>
          }
        />
      )}
    </div>
  );
}
