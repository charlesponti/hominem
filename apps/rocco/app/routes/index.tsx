import { MapPin, Search as SearchIcon } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useRouteLoaderData } from 'react-router'
import Lists from '~/components/lists/lists'
import NearbyPlaces from '~/components/places/nearby-places'
import PlacesAutocomplete from '~/components/places/places-autocomplete'
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'

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
  const layoutData = useRouteLoaderData('routes/layout') as { isAuthenticated: boolean } | undefined
  const isAuthenticated = layoutData?.isAuthenticated ?? false
  const navigate = useNavigate()
  const [, setSelectedPlace] = useState<GooglePlacePrediction | null>(null)
  const [userLocation, setUserLocation] = useState<Location | null>(null)

  // Get user's current location from browser geolocation API
  useEffect(() => {
    if (!isAuthenticated) return

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
  }, [isAuthenticated])

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
    return (
      <div className="flex flex-col items-center justify-center w-full h-full min-h-[calc(100vh-200px)] px-4">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          {/* Hero Section */}
          <div className="space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 mb-4">
              <MapPin className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Your Places, Your Stories
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Save the places you love, organize them into lists, and share your favorite spots with
              friends. Never forget that hidden gem again.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 text-base font-medium rounded-lg text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              Sign In
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-12 h-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                <SearchIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Discover Places</h3>
              <p className="text-gray-600 text-sm">
                Search for any place and save it to your personalized lists
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Find Nearby</h3>
              <p className="text-gray-600 text-sm">
                See places from your lists that are nearby wherever you are
              </p>
            </div>
            <div className="p-6 bg-white rounded-xl border border-gray-200">
              <div className="w-12 h-12 rounded-lg bg-pink-100 flex items-center justify-center mb-4">
                <svg
                  aria-label="Organize & Share"
                  className="w-6 h-6 text-pink-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <title>Organize & Share</title>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Organize & Share</h3>
              <p className="text-gray-600 text-sm">
                Create lists for any occasion and share them with friends
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 min-w-full max-w-6xl mx-auto pb-8" data-testid="home-scene">
      <div className="w-full max-w-2xl mx-auto">
        <PlacesAutocomplete setSelected={handlePlaceSelected} />
      </div>

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
