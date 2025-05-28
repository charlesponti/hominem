import { useAuth } from '@clerk/react-router'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isLoaded, userId } = useAuth()

  if (!isLoaded) {
    return <div className="loading">Loading authentication state...</div>
  }

  if (!userId) {
    return fallback || <div className="auth-required">Please login to access this page</div>
  }

  return <>{children}</>
}
