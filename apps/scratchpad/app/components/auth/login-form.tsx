import { useAuth } from 'app/lib/supabase/auth-context'

export function LoginForm() {
  const { loginWithGoogle, isLoading, error, clearError } = useAuth()

  const handleLoginWithGoogle = async () => {
    clearError()
    await loginWithGoogle()
  }

  return (
    <div className="auth-form">
      <h2>Sign in to continue</h2>

      {error && <div className="error-message">{error.message}</div>}

      <div className="auth-separator">
        <span>Sign in with</span>
      </div>

      <div className="google-auth">
        <button
          type="button"
          onClick={handleLoginWithGoogle}
          disabled={isLoading}
          className="google-login-button"
          aria-label="Sign in with Google"
        >
          {isLoading ? 'Connecting...' : 'Continue with Google'}
        </button>
      </div>
    </div>
  )
}
