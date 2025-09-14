// Auth is now handled client-side with Supabase
import { useSupabaseAuth } from '@hominem/ui'
import { Outlet, useNavigation } from 'react-router'
import { cn } from '~/lib/utils'
import { MainNavigation } from '../components/main-navigation'
import type { Route } from './+types/layout'

export async function loader(loaderArgs: Route.LoaderArgs) {
  // Auth is now handled client-side with Supabase
  // Redirect logic will be handled in components
  return {}
}

export default function Layout({ loaderData }: Route.ComponentProps) {
  const { userId } = useSupabaseAuth()
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
        {userId ? <MainNavigation /> : null}
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
