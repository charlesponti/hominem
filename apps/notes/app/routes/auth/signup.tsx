import { useState } from 'react'
import { Navigate } from 'react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export default function SignUpPage() {
  const { user, signInWithGoogle, isLoading } = useSupabaseAuth()
  const [error, setError] = useState('')

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/" replace />
  }

  const handleGoogleSignup = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-up failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50">
      <div className="w-full max-w-md space-y-8 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Sign up to get started with Notes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md mb-6">{error}</div>
            )}

            <div className="space-y-4">
              <Button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isLoading}
                className="w-full"
                size="lg"
              >
                {isLoading ? 'Loading...' : 'Continue with Google'}
              </Button>
            </div>

            <div className="text-center mt-6">
              <a href="/auth/signin" className="text-sm text-primary hover:underline">
                Already have an account? Sign in
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
