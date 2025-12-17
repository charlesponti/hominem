// Service Worker for Rocco PWA
// Handles caching and update notifications
//
// NOTE: The VERSION constant is automatically injected during build by the Vite plugin.
// Each build gets a unique version based on the build timestamp, ensuring updates are detected.
// Format: build-YYYYMMDDHHmmss (e.g., build-20241215143045)

const VERSION = 'dev' // This will be replaced during build
const CACHE_NAME = `rocco-${VERSION}`
const RUNTIME_CACHE = `rocco-runtime-${VERSION}`

// Assets to cache on install (don't cache root document to avoid stale auth state)
const PRECACHE_ASSETS = ['/favicons/favicon.ico', '/favicons/favicon-196x196.png']

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Failed to precache some assets:', err)
      })
    })
  )
  // Force the waiting service worker to become the active service worker
  self.skipWaiting()
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            // Delete old caches that don't match current version
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE
          })
          .map((cacheName) => caches.delete(cacheName))
      )
    })
  )
  // Take control of all pages immediately
  return self.clients.claim()
})

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Skip cache for HTML documents to avoid caching stale auth state
      const isDocument = event.request.destination === 'document'

      if (cachedResponse && !isDocument) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response
          }

          // Don't cache HTML documents to avoid stale auth state
          if (isDocument) {
            return response
          }

          // Clone the response for caching
          const responseToCache = response.clone()

          // Cache dynamic content in runtime cache
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseToCache)
          })

          return response
        })
        .catch(() => {
          // Network failed - for documents, try fetching without cache
          if (isDocument) {
            return fetch(event.request, { cache: 'no-store' })
          }
        })
    })
  )
})

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CHECK_UPDATE') {
    // Check for updates by fetching the service worker file
    fetch('/sw.js', { cache: 'no-store' })
      .then((response) => {
        if (response.ok) {
          event.ports[0].postMessage({ updateAvailable: true })
        }
      })
      .catch(() => {
        event.ports[0].postMessage({ updateAvailable: false })
      })
  }
})
