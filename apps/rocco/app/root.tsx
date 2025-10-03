import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import type { Route } from './+types/root'
import './index.css'
import { initProductionLogging } from './lib/trpc/logger'
import { TRPCProvider } from './lib/trpc/provider'

// Initialize production logging if in production
if (process.env.NODE_ENV === 'production') {
  initProductionLogging()
}

export const links: Route.LinksFunction = () => [
  { rel: 'icon', href: '/favicons/favicon.ico' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
]

export const meta: Route.MetaFunction = () => [
  { title: 'rocco' },
  { name: 'description', content: 'rocco' },
]

export default function App() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <TRPCProvider>
          <Outlet />
        </TRPCProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
