import { useEffect, useState } from 'react'

export type Location = {
  latitude: number
  longitude: number
}

type UseGeolocationOptions = {
  enabled?: boolean
  enableHighAccuracy?: boolean
  timeout?: number
  maximumAge?: number
}

type UseGeolocationReturn = {
  currentLocation: Location | null
  isLoading: boolean
  error: GeolocationPositionError | null
}

const CACHE_KEY = 'rocco_geolocation_cache'
const CACHE_TIMESTAMP_KEY = 'rocco_geolocation_cache_timestamp'

// Cache location for 5 minutes by default
const DEFAULT_MAXIMUM_AGE = 300000

function getCachedLocation(): Location | null {
  if (typeof window === 'undefined') { return null }

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY)

    if (cached && timestamp) {
      const age = Date.now() - Number.parseInt(timestamp, 10)
      if (age < DEFAULT_MAXIMUM_AGE) {
        return JSON.parse(cached) as Location
      }
    }
  } catch {
    // Ignore cache errors
  }

  return null
}

function setCachedLocation(location: Location): void {
  if (typeof window === 'undefined') { return }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(location))
    localStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()))
  } catch {
    // Ignore cache errors
  }
}

export function useGeolocation(options: UseGeolocationOptions = {}): UseGeolocationReturn {
  const {
    enabled = true,
    enableHighAccuracy = false,
    timeout = 5000,
    maximumAge = DEFAULT_MAXIMUM_AGE,
  } = options

  // Initialize with cached location if available (doesn't block server rendering)
  const [currentLocation, setCurrentLocation] = useState<Location | null>(() =>
    typeof window !== 'undefined' ? getCachedLocation() : null
  )
  const [isLoading, setIsLoading] = useState<boolean>(enabled)
  const [error, setError] = useState<GeolocationPositionError | null>(null)

  useEffect(() => {
    // Don't run on server
    if (typeof window === 'undefined') {
      setIsLoading(false)
      return
    }

    if (!enabled) {
      setIsLoading(false)
      return
    }

    // Check if we have a valid cached location
    const cached = getCachedLocation()
    if (cached) {
      setCurrentLocation(cached)
      setIsLoading(false)
      // Still try to update in the background if cache is getting stale
      const cacheAge =
        Date.now() - Number.parseInt(localStorage.getItem(CACHE_TIMESTAMP_KEY) || '0', 10)
      // Only update if cache is older than half the maximum age
      if (cacheAge < maximumAge / 2) {
        return
      }
    }

    if (!navigator.geolocation) {
      setIsLoading(false)
      setError(
        new Error(
          'Geolocation is not supported by your browser'
        ) as unknown as GeolocationPositionError
      )
      return
    }

    const successHandler = (position: GeolocationPosition) => {
      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }
      setCurrentLocation(location)
      setCachedLocation(location)
      setIsLoading(false)
      setError(null)
    }

    const errorHandler = (err: GeolocationPositionError) => {
      setError(err)
      setIsLoading(false)
      // Don't clear cached location on error, use it as fallback
    }

    navigator.geolocation.getCurrentPosition(successHandler, errorHandler, {
      enableHighAccuracy,
      timeout,
      maximumAge,
    })
  }, [enabled, enableHighAccuracy, timeout, maximumAge])

  return { currentLocation, isLoading, error }
}
