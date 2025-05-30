import { useClerk, useUser } from '@clerk/react-router'

export function Profile() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()

  if (!isLoaded) {
    return <div className="loading">Loading user data...</div>
  }

  if (!user) {
    return <div className="error">User not found</div>
  }

  const handleLogout = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="profile-container">
      <h2>User Profile</h2>
      <div className="profile-info">
        <p>
          <strong>Email:</strong> {user.primaryEmailAddress?.emailAddress || 'No email'}
        </p>
        <p>
          <strong>User ID:</strong> {user.id}
        </p>
        <p>
          <strong>Last Sign In:</strong>{' '}
          {user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString() : 'Never'}
        </p>
      </div>

      <button type="button" className="logout-button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  )
}
