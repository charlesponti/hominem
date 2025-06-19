import { Navigate, Outlet } from 'react-router'
import { useAuth } from '~/lib/supabase'

export default function NotesLayout() {
  const { user, isLoading } = useAuth()

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
