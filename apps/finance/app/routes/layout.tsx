import { AppLayout } from '@hominem/ui/components/layout/app-layout'
import { Toaster } from '@hominem/ui/components/ui/toaster'
import { Suspense } from 'react'
import { Outlet } from 'react-router'
import Header from '../components/header'
import { LoadingScreen } from '../components/loading'
import type { Route } from './+types/layout'

export async function loader(_args: Route.LoaderArgs) {
  return {}
}

export default function Layout({ loaderData: _loaderData }: Route.ComponentProps) {
  return (
    <>
      <AppLayout navigation={<Header />}>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </AppLayout>
      <Toaster />
    </>
  )
}
