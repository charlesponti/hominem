import { getServerSession } from '@/lib/supabase/server'
import { Outlet, redirect, type LoaderFunctionArgs } from 'react-router'

export async function loader(loaderArgs: LoaderFunctionArgs) {
  const session = await getServerSession(loaderArgs.request)

  if (!session?.user) {
    return redirect('/')
  }

  return { userId: session.user.id }
}

export default function ChatLayout() {
  return (
    <div className="fixed inset-0 bg-background h-screen-safe">
      <Outlet />
    </div>
  )
}
