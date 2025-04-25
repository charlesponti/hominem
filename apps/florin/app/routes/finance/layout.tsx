import { RedirectToSignIn, useAuth } from '@clerk/react-router'
import { Outlet } from 'react-router'

export default function FinanceLayout() {
  const { userId } = useAuth()

  if (!userId) {
    return <RedirectToSignIn />
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <Outlet />
    </div>
  )
}
