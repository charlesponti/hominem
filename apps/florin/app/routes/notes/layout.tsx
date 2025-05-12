import { RedirectToSignIn, useAuth } from '@clerk/react-router'
import { Outlet } from 'react-router'

export default function NotesLayout() {
  const { userId, isLoaded } = useAuth()

  // Show nothing while Clerk is loading
  if (!isLoaded) {
    return null
  }

  if (!userId) {
    return <RedirectToSignIn />
  }

  return (
    <div className="flex flex-col h-full">
      <Outlet />
    </div>
  )
}
