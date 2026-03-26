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
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete('twitter');
        return next;
      },
      { replace: true },
    );
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
    <div className="mx-auto max-w-2xl py-8">
      <header className="mb-8">
        <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-text-secondary">Manage your account</p>
      </header>

      <div className="space-y-6">
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
            <div className="flex items-center justify-between rounded-lg border border-border/30 p-4">
              <div>
                <h3 className="text-sm font-medium text-foreground">Sign Out</h3>
                <p className="text-sm text-text-secondary">End your current session.</p>
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
