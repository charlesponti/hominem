import { useSupabaseAuth } from '@hominem/ui'
import { Navigate, Outlet } from 'react-router'

export default function FinanceLayout() {
  const { userId, isLoading } = useSupabaseAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!userId) {
    return <Navigate to="/auth/signin" replace />
  }

  return (
    <div className="container pt-4">
      <Outlet />
    </div>
  )
}
