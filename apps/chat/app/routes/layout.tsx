import { Outlet, useRouteLoaderData } from 'react-router'
import { AppSidebar } from '~/components/app-sidebar'

export default function Layout() {
  const rootData = useRouteLoaderData<{ hominemUserId: string | null }>('root')

  return (
    <div className="min-h-screen h-screen w-full bg-background text-foreground flex flex-row">
      <AppSidebar userId={rootData?.hominemUserId || undefined} />
      <main className="flex-1 flex flex-col h-full">
        <Outlet />
      </main>
    </div>
  )
}
