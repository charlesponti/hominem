import { useEffect, useState } from 'react'

export type Location = {
  latitude: number
  longitude: number
}

type UseGeolocationReturn = {
  currentLocation: Location | null
  isLoading: boolean
  error: GeolocationPositionError | null
}

export function useGeolocation(): UseGeolocationReturn {
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<GeolocationPositionError | null>(null)

  useEffect(() => {
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
      setIsLoading(false)
    }

    const errorHandler = (error: GeolocationPositionError) => {
      setError(error)
      setIsLoading(false)
    }

    navigator.geolocation.getCurrentPosition(successHandler, errorHandler)
  }, [])

  return { currentLocation, isLoading, error }
}
