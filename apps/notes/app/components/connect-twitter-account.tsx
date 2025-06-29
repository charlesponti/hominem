import { Twitter } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { useToast } from '~/components/ui/use-toast'
import { useTwitterOAuth } from '~/hooks/use-twitter'

export function ConnectTwitterAccount() {
  const { toast } = useToast()
  const { accounts, connect, disconnect, isConnecting, error } = useTwitterOAuth()

  const handleConnect = () => {
    connect()
  }

  const handleDisconnect = async (accountId: string) => {
    try {
      await disconnect({ accountId })
      toast({
        title: 'Twitter Account Disconnected',
        description: 'Your Twitter account has been disconnected successfully.',
      })
    } catch (error) {
      console.error('Failed to disconnect Twitter account:', error)
      toast({
        variant: 'destructive',
        title: 'Disconnect Failed',
        description: 'Unable to disconnect Twitter account. Please try again.',
      })
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Twitter className="h-5 w-5" />
          Twitter Integration
        </CardTitle>
        <CardDescription>
          Connect your Twitter account to post tweets directly from your notes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">No Twitter accounts connected</p>
            <Button onClick={handleConnect} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Connect Twitter Account'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Connected accounts:</p>
            {accounts.map((account) => (
              <div
                key={account.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">@{account.providerAccountId}</p>
                  <p className="text-sm text-gray-500">
                    Connected on {new Date(account.expiresAt || '').toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
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

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            Error: {error.message}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
