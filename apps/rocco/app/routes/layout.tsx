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
    <div className="relative min-h-screen">
      <div
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/rocco-background-2.webp')" }}
      />

      <Header />

      <div className="w-full max-w-3xl mx-auto flex-1 flex flex-col mt-24 mb-4 px-2">
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </div>

      <Toaster />
    </div>
  )
}
