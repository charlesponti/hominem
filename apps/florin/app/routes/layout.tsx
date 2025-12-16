import { AppLayout } from '@hominem/ui/components/layout/app-layout'
import { Outlet } from 'react-router'
import { MainNavigation } from '../components/main-navigation'
import type { Route } from './+types/layout'

export async function loader(_args: Route.LoaderArgs) {
  return {}
}

export default function Layout({ loaderData: _loaderData }: Route.ComponentProps) {
  return (
    <AppLayout
      navigation={<MainNavigation />}
      showNavigationProgress
      className="min-h-screen-dynamic"
    >
      <div className="pt-4">
        <Outlet />
      </div>
    </AppLayout>
  )
}
