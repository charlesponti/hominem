'use client'

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

    let timeoutId: NodeJS.Timeout | null = null
    let controllerChangeHandler: (() => void) | null = null

    // Set fallback timeout
    timeoutId = setTimeout(() => {
      setIsReady(true)
      timeoutId = null
    }, 3000)

    // Handle controller change (new service worker activated)
    controllerChangeHandler = () => {
      window.location.reload()
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Manually trigger an update check on launch
        reg.update()

        // If a new worker takes over, reload the app to get new assets
        if (controllerChangeHandler) {
          navigator.serviceWorker.addEventListener('controllerchange', controllerChangeHandler)
        }

        // If there's already an active controller, we're good to go
        if (navigator.serviceWorker.controller) {
          if (timeoutId) {
            clearTimeout(timeoutId)
            timeoutId = null
          }
          setIsReady(true)
        } else {
          // First-time install: wait for the SW to be ready
          navigator.serviceWorker.ready.then(() => {
            if (timeoutId) {
              clearTimeout(timeoutId)
              timeoutId = null
            }
            setIsReady(true)
          })
        }
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
        if (timeoutId) {
          clearTimeout(timeoutId)
          timeoutId = null
        }
        setIsReady(true) // Still show the app even if SW fails
      })

    // Cleanup function
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      if (controllerChangeHandler) {
        navigator.serviceWorker.removeEventListener('controllerchange', controllerChangeHandler)
      }
    }
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
