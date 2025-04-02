import { useAuth } from '../../lib/supabase/auth-context'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="loading">Loading authentication state...</div>
  }

  if (!isAuthenticated) {
    return fallback || <div className="auth-required">Please login to access this page</div>
  }

  return <>{children}</>
}
