import { Suspense } from 'react'
import { Outlet, useLoaderData, useLocation } from 'react-router'
import Footer from '~/components/footer'
import Header from '~/components/header'
import { LoadingScreen } from '~/components/loading'
import { Toaster } from '~/components/ui/toaster'
import { createClient } from '~/lib/supabase/server'
import type { Route } from './+types/layout'

export async function loader({ request }: Route.LoaderArgs) {
  const { supabase } = createClient(request)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return {
    user: user || null,
    isAuthenticated: !!user,
  }
}

export default function Layout() {
  const { isAuthenticated } = useLoaderData<typeof loader>()
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <Header />
      <div className="flex-1 flex overflow-hidden mt-20 p-4">
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
      <Toaster />
      {isAuthenticated && !isHome && <Footer />}
    </div>
  )
}
