import { Outlet, useRouteLoaderData } from 'react-router'
import { AppSidebar } from '~/components/app-sidebar'

export default function Layout() {
  const rootData = useRouteLoaderData<{ hominemUserId: string | null }>('root')

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <AppSidebar userId={rootData?.hominemUserId || undefined} />
      <main className="flex-1 flex-grow flex flex-col">
        <Outlet />
      </main>
    </div>
  )
}
