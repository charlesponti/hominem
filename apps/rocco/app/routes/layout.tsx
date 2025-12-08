import { Suspense } from 'react'
import { Outlet } from 'react-router'
import Header from '~/components/header'
import { LoadingScreen } from '~/components/loading'
import { Toaster } from '@hominem/ui/components/ui/toaster'
import { createClient } from '~/lib/supabase/server'
import type { Route } from './+types/layout'

export async function loader({ request }: Route.LoaderArgs) {
  try {
    const { supabase } = createClient(request)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    return {
      user: user || null,
      isAuthenticated: !!user,
    }
  } catch (error) {
    console.error('Error in layout loader:', error)
    // Always return an object, even on error
    return {
      user: null,
      isAuthenticated: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export default function Layout() {
  return (
    <div className="h-screen max-w-3xl mx-auto flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col mt-24 mb-4 px-2">
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </div>
      <Toaster />
    </div>
  )
}
