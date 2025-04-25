import { useAuth } from '@clerk/react-router'
import { Navigate, Outlet } from 'react-router'

export function Component() {
  const { userId, isLoaded } = useAuth()

  // Show nothing while Clerk is loading
  if (!isLoaded) {
    return null
  }

  // Redirect to sign in if not authenticated
  if (!userId) {
    return <Navigate to="/sign-in" />
  }

  return (
    <div className="w-full">
      <Outlet />
    </div>
  )
}
