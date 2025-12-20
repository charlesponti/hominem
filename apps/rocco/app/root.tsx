import { SupabaseAuthProvider } from '@hominem/auth'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import { useCallback } from 'react'
import { getServerSession } from './lib/auth.server'
import { Links, Meta, Outlet, Scripts, ScrollRestoration, data, useRevalidator } from 'react-router'
import type { Route } from './+types/root'
import './globals.css'
import { env } from './lib/env'
import { initProductionLogging } from './lib/trpc/logger'
import { TRPCProvider } from './lib/trpc/provider'

if (process.env.NODE_ENV === 'production') {
  initProductionLogging()
}

export async function loader({ request }: Route.LoaderArgs) {
  const { session, headers } = await getServerSession(request)

  return data(
    {
      session,
      supabaseEnv: {
        url: env.VITE_SUPABASE_URL,
        anonKey: env.VITE_SUPABASE_ANON_KEY,
      },
    },
    { headers }
  )
}

export const links = () => [
  { rel: 'icon', href: '/favicons/favicon.ico' },
  { rel: 'manifest', href: '/manifest.json' },
  { rel: 'apple-touch-icon', href: '/favicons/apple-touch-icon-152x152.png' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'preload',
    as: 'style',
    href: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Geist+Mono:wght@100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Geist+Mono:wght@100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap',
  },
]

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
  const { session, supabaseEnv } = loaderData
  const revalidator = useRevalidator()

  const handleAuthEvent = useCallback(
    (event: AuthChangeEvent) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        revalidator.revalidate()
      }
    },
    [revalidator]
  )

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
          config={supabaseEnv}
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
