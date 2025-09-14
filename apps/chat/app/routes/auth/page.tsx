import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/supabase/auth-hooks'
import { useState } from 'react'
import { Navigate } from 'react-router'

export default function AuthPage() {
  const { user, signInWithGoogle, isLoading } = useAuth()
  const [error, setError] = useState('')

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/chat" replace />
  }

  const handleGoogleAuth = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google authentication failed')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/50">
      <div className="w-full max-w-md space-y-8 p-8 bg-background border rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold">Welcome to Chat</h2>
          <p className="mt-2 text-muted-foreground">Sign in to your account to continue</p>
        </div>

        {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">{error}</div>}

        <div className="space-y-4">
          <Button
            type="button"
            onClick={handleGoogleAuth}
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? 'Loading...' : 'Continue with Google'}
          </Button>
        </div>
      </div>
    </div>
  )
}
