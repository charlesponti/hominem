import { RedirectToSignIn, useAuth } from '@clerk/react-router'
import { Outlet } from 'react-router'

export default function FinanceLayout() {
  const { userId } = useAuth()

  if (!userId) {
    return <RedirectToSignIn />
  }

  return (
    <div className="container">
      <Outlet />
    </div>
  )
}
