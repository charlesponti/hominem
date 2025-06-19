import { Navigate, Outlet } from 'react-router'
import { useAuth } from '~/lib/supabase'

export default function FinanceLayout() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return (
    <div className="container pt-4">
      <Outlet />
    </div>
  )
}
