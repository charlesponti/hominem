import { SupabaseAuthProvider } from '@hominem/auth'
import { COMMON_FONT_LINKS, COMMON_ICON_LINKS, UpdateGuard } from '@hominem/ui'
import type { AuthChangeEvent } from '@supabase/supabase-js'
import type React from 'react'
import { useCallback } from 'react'
import {
  data,
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRevalidator,
} from 'react-router'
import { FeatureFlagsProvider } from '~/lib/hooks/use-feature-flags'
import type { Route } from './+types/root'
import './globals.css'
import { authConfig, getServerSession } from './lib/auth.server'
import './lib/i18n'
import { TRPCProvider } from './lib/trpc'

export async function loader({ request }: Route.LoaderArgs) {
  const { session, headers } = await getServerSession(request)

  return data(
    {
      session,
      supabaseEnv: {
        url: authConfig.supabaseUrl,
        anonKey: authConfig.supabaseAnonKey,
      },
    },
    { headers }
  )
}

export const meta: Route.MetaFunction = () => {
  return [
    { title: 'Animus' },
    { name: 'description', content: 'Organize and manage your personal notes and knowledge' },
  ]
}

export const links: Route.LinksFunction = () => [...COMMON_FONT_LINKS, ...COMMON_ICON_LINKS]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, maximum-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <UpdateGuard logo="/logo.png" appName="Notes">
          {children}
        </UpdateGuard>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

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
    <SupabaseAuthProvider
      initialSession={session}
      config={supabaseEnv}
      onAuthEvent={handleAuthEvent}
    >
      <TRPCProvider>
        <FeatureFlagsProvider>
          <Outlet />
        </FeatureFlagsProvider>
      </TRPCProvider>
    </SupabaseAuthProvider>
  )
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Oops!'
  let details = 'An unexpected error occurred.'
  let stack: string | undefined

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? '404' : 'Error'
    details =
      error.status === 404 ? 'The requested page could not be found.' : error.statusText || details
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message
    stack = error.stack
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  )
}
