import { Outlet, redirect } from 'react-router'
import { useAuth } from '~/lib/supabase/auth-context'

export default async function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user } = useAuth()

  if (!user) {
    return redirect('/')
  }

  return (
    <div className="fixed inset-0 bg-background h-screen-safe">
      <Outlet />
    </div>
  )
}
