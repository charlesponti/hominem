import { useSupabaseAuth } from '@hominem/ui'
import { useState } from 'react'
import { Navigate } from 'react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'

export default function SignInPage() {
  const { user, signInWithGoogle, isLoading } = useSupabaseAuth()
  const [error, setError] = useState('')

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50">
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

            <div className="text-center mt-6">
              <a href="/auth/signup" className="text-sm text-primary hover:underline">
                Don't have an account? Sign up
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
