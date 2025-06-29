import { Navigate, Outlet } from 'react-router'
import { Loading } from '~/components/ui/loading'
import { useUser } from '~/lib/hooks/use-user'

export default function NotesLayout() {
  const { user, isLoading, isAuthenticated } = useUser()

  // Show loading state while checking auth
  if (isLoading) {
    return <Loading text="Loading..." fullScreen />
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="flex flex-col h-full">
      <Outlet />
    </div>
  )
}
