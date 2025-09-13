import type { ReactNode } from 'react'
import { useAuth } from '../hooks'

interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
  requireAdmin?: boolean
}

export function AuthGuard({ children, fallback, requireAdmin = false }: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (!isAuthenticated || !user) {
    return <>{fallback || <div>Please sign in to continue</div>}</>
  }

  if (requireAdmin && !user.isAdmin) {
    return <>{fallback || <div>Admin access required</div>}</>
  }

  return <>{children}</>
}

interface GuestGuardProps {
  children: ReactNode
  fallback?: ReactNode
}

export function GuestGuard({ children, fallback }: GuestGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (isAuthenticated) {
    return <>{fallback || <div>Already signed in</div>}</>
  }

  return <>{children}</>
}
