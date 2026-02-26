import { Button } from '@hominem/ui/button';
import { Twitter } from 'lucide-react';

import { useTwitterAccounts } from '~/lib/hooks/use-twitter-oauth';

export function ConnectTwitterAccount() {
  const { data: accounts, isLoading } = useTwitterAccounts();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading Twitter accounts...</div>;
  }

  return (
    <div className="space-y-3">
      {accounts.length === 0 ? (
        <Button variant="outline" className="w-full justify-start gap-2" disabled>
          <Twitter className="size-4" />
          Connect Twitter
        </Button>
      ) : (
        <div className="space-y-2">
          {accounts.map((account: { id: string; providerAccountId: string }) => (
            <div key={account.id} className="flex items-center justify-between p-3 border">
              <div className="flex items-center gap-2">
                <Twitter className="size-4 text-muted-foreground" />
                <span className="font-medium">@{account.providerAccountId}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
