import { Outlet, redirect, useNavigation } from 'react-router'
import { getServerSession } from '~/lib/supabase'
import { cn } from '~/lib/utils'
import { MainNavigation } from '../components/main-navigation'
import type { Route } from './+types/layout'

export async function loader(loaderArgs: Route.LoaderArgs) {
  const { user } = await getServerSession(loaderArgs.request)

  if (new URL(loaderArgs.request.url).pathname === '/' && user?.id) {
    // If the user is authenticated, redirect to the `/finance` page
    return redirect('/finance')
  }

  if (new URL(loaderArgs.request.url).pathname !== '/' && !user?.id) {
    // If the user is not authenticated, redirect to the `/auth` page
    return redirect('/auth')
  }

  return { userId: user?.id }
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { userId } = loaderData
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
        <main
          className={cn('flex-1 overflow-hidden pt-16 md:pt-0', {
            'md:pl-16': userId,
          })}
        >
          <div className="md:mx-auto px-2">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  )
}
