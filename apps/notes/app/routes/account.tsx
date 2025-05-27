import { RedirectToSignIn, SignOutButton, useAuth } from '@clerk/react-router'
import { Download, Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { useToast } from '~/components/ui/use-toast'
import { useTwitterOAuth } from '~/lib/hooks/use-twitter-oauth'

export default function AccountPage() {
  const { userId } = useAuth()
  const { toast } = useToast()
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
    refetch,
  } = useTwitterOAuth()

  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrlParams(new URLSearchParams(window.location.search))
    }
  }, [])

  useEffect(() => {
    if (urlParams) {
      const twitterStatus = urlParams.get('twitter')
      if (twitterStatus === 'connected') {
        toast({
          title: 'Success',
          description: 'Twitter account connected successfully!',
        })
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname)
        // Refresh accounts
        refetch()
      } else if (twitterStatus === 'error') {
        toast({
          title: 'Error',
          description: 'Failed to connect Twitter account. Please try again.',
          variant: 'destructive',
        })
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [urlParams, toast, refetch])

  const handleConnect = () => {
    connectTwitter()
  }

  const handleDisconnect = (accountId: string) => {
    disconnectTwitter(accountId)
  }

  const handleSyncTweets = () => {
    syncTweets(undefined, {
      onSuccess: (data) => {
        toast({
          title: 'Tweets synced successfully!',
          description: `Imported ${data.synced} new tweets from your Twitter account.`,
        })
      },
      onError: (error) => {
        console.error('Failed to sync tweets:', error)
        toast({
          title: 'Failed to sync tweets',
          description: 'There was an error syncing your tweets. Please try again.',
          variant: 'destructive',
        })
      },
    })
  }

  if (!userId) {
    return <RedirectToSignIn />
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          Profile
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Manage your account</p>
      </header>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts</CardTitle>
            <CardDescription>
              Connect your social media accounts to enhance your experience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            {error && <div className="text-sm text-red-600 dark:text-red-400">{error}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Manage your session.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-md">
              <div>
                <h3 className="font-medium">Sign Out</h3>
                <p className="text-sm text-muted-foreground">End your current session.</p>
              </div>
              <SignOutButton>
                <Button variant="outline">Sign Out</Button>
              </SignOutButton>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
