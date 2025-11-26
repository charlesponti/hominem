import { Navigate } from 'react-router'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card'
import { useToast } from '~/components/ui/use-toast'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export default function SignInPage() {
  const { user, signInWithGoogle, isLoading } = useSupabaseAuth()
  const { toast } = useToast()

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/notes" replace />
  }

  const handleGoogleLogin = async () => {
    try {
      await signInWithGoogle()
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: err instanceof Error ? err.message : 'Google sign-in failed',
      })
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-background to-muted/50">
      <div className="w-full max-w-md space-y-8 p-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center">Welcome Back</CardTitle>
            <CardDescription className="text-center">Sign in to your Notes account</CardDescription>
          </CardHeader>
          <CardContent>
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
