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
    <div className="h-full overflow-hidden">
      <Outlet />
    </div>
  )
}
