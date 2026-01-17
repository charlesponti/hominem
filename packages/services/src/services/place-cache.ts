import type { Place } from '@hominem/db/schema'

// In-memory cache for place lookups
type CacheEntry<T> = {
  data: T
  expiresAt: number
}

export class PlaceCache {
  private cache = new Map<string, CacheEntry<Place>>()
  readonly TTL_MS = 5 * 60 * 1000 // 5 minutes for googleMapsId lookups
  readonly TTL_SHORT_MS = 2 * 60 * 1000 // 2 minutes for id lookups

  get(key: string): Place | null {
    const entry = this.cache.get(key)
    if (!entry) {
      return null
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }

    return entry.data
  }

  set(key: string, data: Place, ttl: number = this.TTL_MS): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttl,
    })
  }

  delete(key: string): void {
    this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }

  // Clean up expired entries (call periodically)
  cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []
    for (const [key, entry] of this.cache) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach((key) => {
      this.cache.delete(key)
    })
  }
}

export const placeCache = new PlaceCache()

// Cleanup expired entries every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      placeCache.cleanup()
    },
    10 * 60 * 1000
  )
}
