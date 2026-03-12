import { Inline, Stack } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Twitter } from 'lucide-react';

import { useTwitterAccounts } from '~/lib/hooks/use-twitter-oauth';

export function ConnectTwitterAccount() {
  const { data: accounts, isLoading } = useTwitterAccounts();

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading Twitter accounts...</div>;
  }

  return (
    <Stack gap="sm">
      {accounts.length === 0 ? (
        <Button variant="outline" className="w-full justify-start gap-2" disabled>
          <Twitter className="size-4" />
          Connect Twitter
        </Button>
      ) : (
        <Stack gap="sm">
          {accounts.map((account: { id: string; providerAccountId: string }) => (
            <Inline key={account.id} justify="between" className="p-3 border">
              <Inline gap="sm">
                <Twitter className="size-4 text-muted-foreground" />
                <span className="font-medium">@{account.providerAccountId}</span>
              </Inline>
            </Inline>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
