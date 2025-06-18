import { Outlet } from 'react-router'
import { MainNavigation } from '~/components/main-navigation'
import { Toaster } from '~/components/ui/toaster'

export default function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen flex-col">
        <MainNavigation />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  )
}
