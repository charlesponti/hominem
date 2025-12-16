import { useEffect } from 'react'

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Register service worker
      navigator.serviceWorker
        .register('/sw.js', {
          scope: '/',
          updateViaCache: 'none', // Always check for updates, don't cache the service worker file
        })
        .then((registration) => {
          // Check for updates immediately after registration
          registration.update()

          // Check for updates periodically (every 30 minutes)
          setInterval(
            () => {
              registration.update()
            },
            30 * 60 * 1000
          )

          // Check for updates when the page becomes visible
          const handleVisibilityChange = () => {
            if (!document.hidden) {
              registration.update()
            }
          }

          document.addEventListener('visibilitychange', handleVisibilityChange)

          // Check for updates when the app comes back online
          window.addEventListener('online', () => {
            registration.update()
          })

          return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
          }
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error)
        })
    }
  }, [])

  return null
}
