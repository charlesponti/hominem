import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './index'
import { LoadingScreen } from '@hominem/components/Loading'
import { LOGIN } from '../routes'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isPending, user } = useAuth()
  const location = useLocation()

  if (isPending) {
    return <LoadingScreen />
  }

  if (!user) {
    // Redirect to the login page but save the attempted location
    return <Navigate to={LOGIN} state={{ from: location }} replace />
  }

  return <>{children}</>
}
