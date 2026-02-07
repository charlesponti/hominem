import { Button } from '@hominem/ui/button';
import { Badge } from '@hominem/ui/components/ui/badge';
import { CheckCircleIcon } from 'lucide-react';

import type { Account } from '~/lib/types/account.types';

import { useAllInstitutions } from '~/lib/hooks/use-institutions';

import { AccountConnectionDialog } from './account-connection-dialog';

export function ManualInstitutionStatus({
  account,
  showDialog,
}: {
  account: Account;
  showDialog?: boolean;
}) {
  const institutionsQuery = useAllInstitutions();
  const institution = Array.isArray(institutionsQuery.data)
    ? institutionsQuery.data.find((inst) => inst.id === account.institutionId)
    : undefined;
  return (
    <div className="flex items-center space-x-2">
      <Badge variant="secondary" className="text-foreground border border-foreground">
        <CheckCircleIcon className="size-3 mr-1" />
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
  );
}
