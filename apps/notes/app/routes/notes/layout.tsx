import { useSupabaseAuth } from '@hominem/ui'
import { Navigate, Outlet } from 'react-router'

export default function NotesLayout() {
  const { userId, isLoading } = useSupabaseAuth()

  // Show loading while Supabase is loading
  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!userId) {
    return <Navigate to="/auth/signin" replace />
  }

  return (
    <div className="flex flex-col h-full">
      <Outlet />
    </div>
  )
}
