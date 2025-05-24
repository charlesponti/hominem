import { ClerkProvider } from '@clerk/react-router'
import { rootAuthLoader } from '@clerk/react-router/ssr.server'
import { QueryClientProvider } from '@tanstack/react-query'
import type React from 'react'
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'

// Import routes
import type { Route } from './+types/root'
import { UserProvider } from './context/user-context'
import './globals.css'
import { getQueryClient } from './lib/get-query-client'

export async function loader(args: Route.LoaderArgs) {
  return rootAuthLoader(args)
}

export const links: Route.LinksFunction = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&family=Geist+Mono:wght@100..900&family=Noto+Sans:ital,wght@0,100..900;1,100..900&display=swap',
  },
  // Favicon
  { rel: 'icon', type: 'image/x-icon', href: 'icons/favicon.ico' },
  { rel: 'icon', type: 'image/png', sizes: '16x16', href: 'icons/favicon-16x16.png' },
  { rel: 'icon', type: 'image/png', sizes: '32x32', href: 'icons/favicon-32x32.png' },
  { rel: 'icon', type: 'image/png', sizes: '96x96', href: 'icons/favicon-96x96.png' },

  // Apple Touch Icons
  { rel: 'apple-touch-icon', href: 'icons/apple-touch-icon.png' },
  { rel: 'apple-touch-icon', sizes: '57x57', href: 'icons/apple-touch-icon-57x57.png' },
  { rel: 'apple-touch-icon', sizes: '60x60', href: 'icons/apple-touch-icon-60x60.png' },
  { rel: 'apple-touch-icon', sizes: '72x72', href: 'icons/apple-touch-icon-72x72.png' },
  { rel: 'apple-touch-icon', sizes: '76x76', href: 'icons/apple-touch-icon-76x76.png' },
  { rel: 'apple-touch-icon', sizes: '114x114', href: 'icons/apple-touch-icon-114x114.png' },
  { rel: 'apple-touch-icon', sizes: '120x120', href: 'icons/apple-touch-icon-120x120.png' },
  { rel: 'apple-touch-icon', sizes: '144x144', href: 'icons/apple-touch-icon-144x144.png' },
  { rel: 'apple-touch-icon', sizes: '152x152', href: 'icons/apple-touch-icon-152x152.png' },
  { rel: 'apple-touch-icon', sizes: '180x180', href: 'icons/apple-touch-icon-180x180.png' },

  // Android Icons
  { rel: 'icon', type: 'image/png', sizes: '36x36', href: 'icons/android-icon-36x36.png' },
  { rel: 'icon', type: 'image/png', sizes: '48x48', href: 'icons/android-icon-48x48.png' },
  { rel: 'icon', type: 'image/png', sizes: '72x72', href: 'icons/android-icon-72x72.png' },
  { rel: 'icon', type: 'image/png', sizes: '96x96', href: 'icons/android-icon-96x96.png' },
  { rel: 'icon', type: 'image/png', sizes: '144x144', href: 'icons/android-icon-144x144.png' },
  { rel: 'icon', type: 'image/png', sizes: '192x192', href: 'icons/android-icon-192x192.png' },

  // Web Manifest
  { rel: 'manifest', href: 'icons/manifest.json' },

  // Safari Pinned Tab Icon
  { rel: 'mask-icon', href: 'icons/safari-pinned-tab.svg', color: '#ffffff' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
export default function App({ loaderData }: { loaderData: Route.ComponentProps }) {
  const queryClient = getQueryClient()

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      loaderData={loaderData}
      signInFallbackRedirectUrl="/"
      signUpFallbackRedirectUrl="/"
    >
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          <Outlet />
        </UserProvider>
      </QueryClientProvider>
    </ClerkProvider>
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
