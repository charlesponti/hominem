import { SupabaseAuthProvider } from '@hominem/auth'
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router'
import { ServiceWorkerRegister } from './components/pwa/service-worker-register'
import { UpdateNotification } from './components/pwa/update-notification'
import { initProductionLogging } from './lib/trpc/logger'
import { TRPCProvider } from './lib/trpc/provider'
import './globals.css'

if (process.env.NODE_ENV === 'production') {
  initProductionLogging()
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
        <SupabaseAuthProvider>
          <TRPCProvider>
            <Outlet />
            <UpdateNotification onUpdate={() => window.location.reload()} />
          </TRPCProvider>
        </SupabaseAuthProvider>
        <ServiceWorkerRegister />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  )
}
