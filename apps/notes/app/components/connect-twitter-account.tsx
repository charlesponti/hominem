import { Download, Loader2 } from 'lucide-react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { useFeatureFlag } from '~/lib/hooks/use-feature-flags'
import { useTwitterOAuth } from '~/lib/hooks/use-twitter-oauth'

interface ConnectTwitterAccountProps {
  onSyncSuccess?: (data: { synced: number }) => void
  onSyncError?: (error: unknown) => void
}

export function ConnectTwitterAccount({ onSyncSuccess, onSyncError }: ConnectTwitterAccountProps) {
  const isTwitterEnabled = useFeatureFlag('twitterIntegration')
  const {
    accounts,
    isLoading,
    isConnecting,
    isDisconnecting,
    isSyncing,
    error,
    connectTwitter,
    disconnectTwitter,
    syncTweets,
  } = useTwitterOAuth()

  const handleConnect = () => {
    connectTwitter()
  }

  const handleDisconnect = (accountId: string) => {
    disconnectTwitter(accountId)
  }

  const handleSyncTweets = () => {
    syncTweets(undefined, {
      onSuccess: onSyncSuccess,
      onError: onSyncError,
    })
  }

  if (!isTwitterEnabled) {
    return (
      <div className="flex items-center justify-center p-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-md">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No social media integrations are currently available.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 border rounded-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium">Twitter</h3>
            <p className="text-sm text-muted-foreground">
              {accounts.length > 0
                ? `${accounts.length} account${accounts.length === 1 ? '' : 's'} connected`
                : 'Connect your Twitter account'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {accounts.length > 0 ? (
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Connected</Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncTweets}
                disabled={isLoading || isSyncing}
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Sync Tweets
                  </>
                )}
              </Button>
              {accounts.map((account) => (
                <Button
                  key={account.id}
                  variant="outline"
                  size="sm"
                  onClick={() => handleDisconnect(account.id)}
                  disabled={isLoading || isDisconnecting}
                >
                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              ))}
            </div>
          ) : (
            <Button
              onClick={handleConnect}
              disabled={isLoading || isConnecting}
              variant="outline"
            >
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          )}
        </div>
      </div>
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
      )}
    </div>
  )
}
