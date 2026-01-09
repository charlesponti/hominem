import { SupabaseAuthProvider } from '@hominem/auth'
import { COMMON_FONT_LINKS, COMMON_ICON_LINKS } from '@hominem/ui'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import { useCallback } from 'react'
import { data, Links, Meta, Outlet, Scripts, ScrollRestoration, useRevalidator } from 'react-router'
import type { Route } from './+types/root'
import ErrorBoundary from './components/ErrorBoundary'
import './globals.css'
import { getServerSession } from './lib/auth.server'
import { initProductionLogging } from './lib/trpc/logger'
import { TRPCProvider } from './lib/trpc/provider'

if (typeof process !== 'undefined' && process.env.NODE_ENV === 'production') {
  initProductionLogging()
}

export async function loader({ request }: Route.LoaderArgs) {
  const { session, headers } = await getServerSession(request)

  return data(
    {
      session,
    },
    { headers }
  )
}

export const links: Route.LinksFunction = () => [...COMMON_FONT_LINKS, ...COMMON_ICON_LINKS]

export const meta = () => [
  { title: 'rocco' },
  { name: 'description', content: 'rocco' },
  { name: 'theme-color', content: '#000000' },
  { name: 'apple-mobile-web-app-capable', content: 'yes' },
  { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
  { name: 'apple-mobile-web-app-title', content: 'Rocco' },
  { name: 'mobile-web-app-capable', content: 'yes' },
  { property: 'og:title', content: 'rocco' },
  { property: 'og:description', content: 'Your personal place list' },
  { property: 'og:type', content: 'website' },
  { name: 'twitter:card', content: 'summary_large_image' },
]

export default function App({ loaderData }: Route.ComponentProps) {
  const { session } = loaderData
  const revalidator = useRevalidator()

  const handleAuthEvent = useCallback(
    (event: AuthChangeEvent) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        revalidator.revalidate()
      }
    },
    [revalidator]
  )

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!(supabaseUrl && supabaseAnonKey)) {
    throw new Error(
      'Missing required Supabase environment variables. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
    )
  }

  const supabaseConfig = {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
  }

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <SupabaseAuthProvider
          initialSession={session}
          config={supabaseConfig}
          onAuthEvent={handleAuthEvent}
        >
          <TRPCProvider>
            <Outlet />
          </TRPCProvider>
        </SupabaseAuthProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

export { ErrorBoundary }
