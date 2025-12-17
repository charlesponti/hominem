import { getServerAuth } from '@hominem/auth/server'
import { useSupabaseAuthContext } from '@hominem/ui'
import { Button } from '@hominem/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card'
import { useCallback, useState } from 'react'
import { data, type LoaderFunctionArgs, redirect } from 'react-router'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user, headers } = await getServerAuth(request)

  if (!user) {
    return redirect('/', { headers })
  }

  return data({ user }, { headers })
}

export default function SignInPage() {
  const { supabase, isLoading } = useSupabaseAuthContext()
  const [error, setError] = useState('')

  const handleGoogleLogin = useCallback(async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/')}`,
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    }
  }, [supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted/50">
      <div className="w-full max-w-md space-y-8 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your Florin account
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mb-6">{error}</div>
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
  )
}
