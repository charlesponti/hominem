import { AppLayout } from '@hominem/ui/components/layout/app-layout'
import { Toaster } from '@hominem/ui/components/ui/toaster'
import { Suspense } from 'react'
import { Outlet } from 'react-router'
import Header from '~/components/header'
import { LoadingScreen } from '~/components/loading'
import { getAuthState } from '~/lib/services/auth-loader.service'
import type { Route } from './+types/layout'

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const { isAuthenticated } = await getAuthState(request)
    return {
      isAuthenticated,
    }
  } catch (error) {
    return {
      user: null,
      isAuthenticated: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export default function Layout() {
  return (
    <>
      <AppLayout navigation={<Header />} backgroundImage="/rocco-background-2.webp">
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </AppLayout>

      <Toaster />
    </>
  )
}
