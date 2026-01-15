import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

interface UpdateGuardProps {
  children: ReactNode
  logo?: string
  appName?: string
}

export function UpdateGuard({ children, logo = '/logo.png', appName = 'App' }: UpdateGuardProps) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setIsReady(true) // Not a PWA-capable browser
      return
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // 1. Manually trigger an update check on launch
        reg.update()

        // 2. If a new worker takes over, reload the app to get new assets
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload()
        })

        // 3. If there's already an active controller, we're good to go
        if (navigator.serviceWorker.controller) {
          setIsReady(true)
        } else {
          // First-time install: wait for the SW to be ready
          navigator.serviceWorker.ready.then(() => setIsReady(true))
        }
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
        setIsReady(true) // Still show the app even if SW fails
      })

    // Fallback: Don't keep them on the load screen forever (e.g., 3 seconds)
    const timeout = setTimeout(() => setIsReady(true), 3000)
    return () => clearTimeout(timeout)
  }, [])

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <img
          src={logo}
          alt={`${appName} Logo`}
          className="w-32 h-32 mb-4 animate-pulse"
        />
        <p className="text-muted-foreground">Checking for updates...</p>
      </div>
    )
  }

  return <>{children}</>
}
