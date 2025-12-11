import { useSupabaseAuthContext } from '@hominem/ui'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import Lists from '~/components/lists/lists'
import NearbyPlaces from '~/components/places/nearby-places'
import PlacesAutocomplete from '~/components/places/places-autocomplete'
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'
import AboutPage from './about'

// Default location: San Francisco (fallback)
const DEFAULT_LOCATION = {
  latitude: 37.7749,
  longitude: -122.4194,
}

type Location = {
  latitude: number
  longitude: number
}

export default function Index() {
  const { isAuthenticated, isLoading: authLoading } = useSupabaseAuthContext()
  const navigate = useNavigate()
  const [, setSelectedPlace] = useState<GooglePlacePrediction | null>(null)
  const [userLocation, setUserLocation] = useState<Location | null>(null)

  // Get user's current location from browser geolocation API
  useEffect(() => {
    if (!isAuthenticated || authLoading) return

    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        console.error('Error getting location:', error)
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 300000, // Cache location for 5 minutes
      }
    )
  }, [isAuthenticated, authLoading])

  // Use user's geolocation if available, otherwise fall back to default
  const defaultLocation = userLocation || DEFAULT_LOCATION

  const handlePlaceSelected = useCallback(
    (place: GooglePlacePrediction) => {
      setSelectedPlace(place)
      // Navigate to the place page
      navigate(`/places/${place.place_id}`)
    },
    [navigate]
  )

  // Unauthenticated view: Landing page
  if (!isAuthenticated) {
    return <AboutPage />
  }

  return (
    <div className="flex flex-col gap-8 min-w-full max-w-6xl mx-auto pb-8" data-testid="home-scene">
      <PlacesAutocomplete setSelected={handlePlaceSelected} />

      <NearbyPlaces
        latitude={defaultLocation.latitude}
        longitude={defaultLocation.longitude}
        radiusKm={5}
        limit={4}
      />

      <Lists />
    </div>
  )
}
