import { Button } from '@hominem/ui/button';
import { useToast } from '@hominem/ui/components/ui/use-toast';
import { Twitter } from 'lucide-react';

import { useTwitterOAuth } from '~/hooks/use-twitter';

export function ConnectTwitterAccount() {
  const { toast } = useToast();
  const { accounts, connect, disconnect, isConnecting } = useTwitterOAuth();

  const handleConnect = () => {
    connect();
  };

  const handleDisconnect = async (accountId: string) => {
    try {
      await disconnect({ accountId });
      toast({
        title: 'Disconnected',
        description: 'Twitter account disconnected.',
      });
    } catch (error) {
      console.error('Failed to disconnect Twitter account:', error);
      toast({
        variant: 'destructive',
        title: 'Disconnect failed',
        description: 'Please try again.',
      });
    }
  };

  return (
    <div className="space-y-3">
      {accounts.length === 0 ? (
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          variant="outline"
          className="w-full justify-start gap-2"
        >
          <Twitter className="size-4" />
          {isConnecting ? 'Connecting...' : 'Connect Twitter'}
        </Button>
      ) : (
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Twitter className="size-4 text-gray-500" />
                <span className="font-medium">@{account.providerAccountId}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDisconnect(account.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Disconnect
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
