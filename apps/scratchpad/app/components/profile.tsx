import { useAuth } from 'app/lib/supabase/auth-context'

export function Profile() {
  const { user, logout, isLoading } = useAuth()

  if (isLoading) {
    return <div className="loading">Loading user data...</div>
  }

  if (!user) {
    return <div className="error-message">Not authenticated</div>
  }

  return (
    <div className="profile-container">
      <h2>User Profile</h2>
      <div className="profile-info">
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>User ID:</strong> {user.id}
        </p>
        <p>
          <strong>Last Sign In:</strong> {new Date(user.last_sign_in_at || '').toLocaleString()}
        </p>
      </div>

      <button type="button" className="logout-button" onClick={() => logout()} disabled={isLoading}>
        Logout
      </button>
    </div>
  )
}
