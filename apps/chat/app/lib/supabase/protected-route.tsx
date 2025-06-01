import type { ReactNode } from 'react'
import { Navigate } from 'react-router'
import { useAuthContext } from './auth-context'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
  redirectTo?: string
}

export function ProtectedRoute({
  children,
  fallback = <Navigate to="/auth" replace />,
  redirectTo,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthContext()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />
    }
    return <>{fallback}</>
  }

  return <>{children}</>
}
