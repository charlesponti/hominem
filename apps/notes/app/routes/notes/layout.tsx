import { Navigate, Outlet } from 'react-router'
import { useSupabaseAuth } from '~/lib/supabase/use-auth'

export default function NotesLayout() {
  const { userId, isLoading } = useSupabaseAuth()

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
