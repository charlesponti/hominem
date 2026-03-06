import { useAuthContext } from '@hominem/auth';
import { Button } from '@hominem/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card';
import { useCallback, useState } from 'react';
import { data, type LoaderFunctionArgs, redirect } from 'react-router';

import { getServerAuth } from '~/lib/auth.server';

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getServerAuth(request);

  if (user) {
    return redirect('/finance', { headers });
  }

  return data({ user: null }, { headers });
}

export default function SignInPage() {
  const { authClient, isLoading } = useAuthContext();
  const [error, setError] = useState('');

  const handleGoogleLogin = useCallback(async () => {
    try {
      await authClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/')}`,
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
    }
  }, [authClient.auth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Sign In</CardTitle>
            <CardDescription className="text-center">Access your Florin account</CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-destructive text-sm bg-destructive/10 p-3 mb-6">{error}</div>
            )}

            <div className="space-y-4">
              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Loading...' : 'Continue with Google'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
