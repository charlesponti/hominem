import { getAuth } from '@clerk/react-router/ssr.server'
import { redirect, type LoaderFunctionArgs, Outlet } from 'react-router'

export async function loader(loaderArgs: LoaderFunctionArgs) {
  const { userId } = await getAuth(loaderArgs)
  if (!userId) {
    return redirect('/')
  }
  return { userId }
}

export default function ChatLayout() {
  return (
    <div className="fixed inset-0 bg-background h-screen-safe">
      <Outlet />
    </div>
  )
}
