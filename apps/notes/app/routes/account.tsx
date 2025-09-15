import { useSupabaseAuth } from '@hominem/ui'
import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { ConnectTwitterAccount } from '~/components/connect-twitter-account'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { useToast } from '~/components/ui/use-toast'
import { useTwitterOAuth } from '~/lib/hooks/use-twitter-oauth'

export default function AccountPage() {
  const { userId, isLoading, logout } = useSupabaseAuth()
  const { toast } = useToast()
  const { refetch } = useTwitterOAuth()

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

  const handleSyncSuccess = (data: { synced: number }) => {
    toast({
      title: 'Tweets synced successfully!',
      description: `Imported ${data.synced} new tweets from your Twitter account.`,
    })
  }

  const handleSyncError = (error: unknown) => {
    console.error('Failed to sync tweets:', error)
    toast({
      title: 'Failed to sync tweets',
      description: 'There was an error syncing your tweets. Please try again.',
      variant: 'destructive',
    })
  }

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!userId) {
    return <Navigate to="/auth/signin" replace />
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
            <ConnectTwitterAccount
              onSyncSuccess={handleSyncSuccess}
              onSyncError={handleSyncError}
            />
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
              <Button variant="outline" onClick={() => logout()}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
