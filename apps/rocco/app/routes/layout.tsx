import { AppLayout } from '@hominem/ui/components/layout/app-layout'
import { LoadingScreen } from '@hominem/ui/loading'
import { Suspense } from 'react'
import { data, Outlet } from 'react-router'
import ErrorBoundary from '~/components/ErrorBoundary'
import Header from '~/components/header'
import { getAuthState } from '~/lib/auth.server'
import type { Route } from './+types/layout'

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const { isAuthenticated, headers } = await getAuthState(request)
    return data(
      {
        isAuthenticated,
      },
      { headers }
    )
  } catch (error) {
    const { headers } = await getAuthState(request)
    return data(
      {
        user: null,
        isAuthenticated: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { headers }
    )
  }
}

export default function Layout() {
  return (
    <AppLayout navigation={<Header />} backgroundImage="/rocco-background-2.webp">
      <Suspense fallback={<LoadingScreen />}>
        <Outlet />
      </Suspense>
    </AppLayout>
  )
}

export { ErrorBoundary }
