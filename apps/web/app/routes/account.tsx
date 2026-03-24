import { useAuthContext } from '@hominem/auth';
import { Button } from '@hominem/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@hominem/ui/card';
import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router';

import { ConnectTwitterAccount } from '~/components/connect-twitter-account';
import { useTwitterOAuth } from '~/lib/hooks/use-twitter-oauth';

export default function AccountPage() {
  const { userId, isLoading, logout } = useAuthContext();
  const { refetch } = useTwitterOAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const twitterStatus = searchParams.get('twitter');

  useEffect(() => {
    if (!twitterStatus) return;
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('twitter');
      return next;
    }, { replace: true });
    if (twitterStatus === 'connected') {
      refetch();
    }
  }, [twitterStatus, refetch, setSearchParams]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!userId) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8 max-w-3xl">
      <header className="mb-8">
        <h1 className="heading-2 text-foreground">Profile</h1>
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
