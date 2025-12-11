import { SupabaseAuthProvider } from '@hominem/ui'
import { useMemo } from 'react'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import './index.css'
import { createClient } from './lib/supabase/client'
import { initProductionLogging } from './lib/trpc/logger'
import { TRPCProvider } from './lib/trpc/provider'

if (process.env.NODE_ENV === 'production') {
  initProductionLogging()
}

export const links = () => [
  { rel: 'icon', href: '/favicons/favicon.ico' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
]

export const meta = () => [{ title: 'rocco' }, { name: 'description', content: 'rocco' }]

export default function App() {
  const supabaseClient = useMemo(() => createClient(), [])

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <SupabaseAuthProvider client={supabaseClient}>
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
