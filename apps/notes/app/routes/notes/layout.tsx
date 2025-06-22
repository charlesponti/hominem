import type { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export default function NotesLayout() {
  const { getUser } = useSupabaseAuth()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getUser()
        setUser(currentUser)
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchUser()
  }, [getUser])

  // Show loading state while checking auth
  if (isLoading) {
    return <div>Loading...</div>
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="flex flex-col h-full">
      <Outlet />
    </div>
  )
}
