import { useState } from 'react'
import { useAuth } from '../../lib/supabase/auth-context'

export function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const { signup, isLoading, error, clearError } = useAuth()

  const validatePasswordMatch = () => {
    if (password !== passwordConfirm) {
      setPasswordError('Passwords do not match')
      return false
    }
    setPasswordError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    if (!validatePasswordMatch()) return

    await signup(email, password)
  }

  return (
    <div className="auth-form">
      <h2>Create an Account</h2>
      {error && <div className="error-message">{error.message}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="signup-email">Email</label>
          <input
            id="signup-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>
        <div className="form-group">
          <label htmlFor="signup-password-confirm">Confirm Password</label>
          <input
            id="signup-password-confirm"
            type="password"
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            minLength={6}
          />
          {passwordError && <div className="error-message">{passwordError}</div>}
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  )
}
