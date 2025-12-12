import { useState } from 'react'
import { redirect, type LoaderFunctionArgs } from 'react-router'
import { Button } from '@hominem/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@hominem/ui/components/ui/card'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'
import { getServerSession } from '~/lib/supabase/server'

export async function loader({ request }: LoaderFunctionArgs) {
  const { user } = await getServerSession(request)

  if (!user) {
    return redirect('/')
  }

  return { user }
}

export default function SignInPage() {
  const { signInWithGoogle, isLoading } = useSupabaseAuth()
  const [error, setError] = useState('')

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    }
  }

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
