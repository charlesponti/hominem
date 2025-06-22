import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export function Profile() {
  const { getUser, signOut } = useSupabaseAuth()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadUser()
  }, [getUser])

  if (isLoading) {
    return <div className="loading">Loading user data...</div>
  }

  if (!user) {
    return <div className="error">User not found</div>
  }

  const handleLogout = async () => {
    try {
      await signOut()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className="profile-container">
      <h2>User Profile</h2>
      <div className="profile-info">
        <p>
          <strong>Email:</strong> {user.email || 'No email'}
        </p>
        <p>
          <strong>User ID:</strong> {user.id}
        </p>
        <p>
          <strong>Last Sign In:</strong>{' '}
          {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Never'}
        </p>
      </div>

      <button type="button" className="logout-button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  )
}
