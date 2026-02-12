import { useSupabaseAuthContext } from '@hominem/auth';
import { Button } from '@hominem/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hominem/ui/card';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router';

import { ConnectTwitterAccount } from '~/components/connect-twitter-account';
import { useTwitterOAuth } from '~/lib/hooks/use-twitter-oauth';

export default function AccountPage() {
  const { userId, isLoading, logout } = useSupabaseAuthContext();
  const { refetch } = useTwitterOAuth();

  const [urlParams, setUrlParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setUrlParams(new URLSearchParams(window.location.search));
    }
  }, []);

  useEffect(() => {
    if (urlParams) {
      const twitterStatus = urlParams.get('twitter');
      if (twitterStatus === 'connected') {
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
        // Refresh accounts
        refetch();
      } else if (twitterStatus === 'error') {
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [urlParams, refetch]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!userId) {
    return <Navigate to="/auth/signin" replace />;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account</p>
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
            <ConnectTwitterAccount />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authentication</CardTitle>
            <CardDescription>Manage your session.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border ">
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
  );
}
