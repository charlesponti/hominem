import { Outlet, useNavigation } from 'react-router'
import { MainNavigation } from '../components/main-navigation'
import type { Route } from './+types/layout'

export async function loader(_args: Route.LoaderArgs) {
  return {}
}

export default function Layout({ loaderData: _loaderData }: Route.ComponentProps) {
  const navigation = useNavigation()
  const isNavigating = navigation.state !== 'idle'

  return (
    <>
      {/* Progress indicator for navigation */}
      {isNavigating && (
        <div className="fixed top-0 left-0 w-full z-50">
          <div className="h-1 bg-primary animate-pulse" />
        </div>
      )}
      <div className="bg-background text-foreground min-h-screen-dynamic min-w-full flex flex-col">
        <MainNavigation />
        <main className="flex-1 overflow-hidden pt-4 px-2 md:px-0">
          <div className="container mx-auto" style={{ paddingInline: 0 }}>
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}
