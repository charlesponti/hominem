import type { MapMouseEvent } from '@vis.gl/react-google-maps'
import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import LazyMap from '~/components/map.lazy'
import { ZOOM_LEVELS } from '~/components/map-layout/constants'
import {
  useListData,
  useMapCenter,
  useMapMarkers,
  usePlaceData,
} from '~/components/map-layout/hooks'
import { MapControls } from '~/components/map-layout/map-controls'
import { createPlaceFromPrediction } from '~/components/map-layout/utils'
import PlacesAutocomplete from '~/components/places/places-autocomplete'
import { useGeolocation } from '~/hooks/useGeolocation'
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'
import { cn } from '~/lib/utils'

export default function ExplorePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const { currentLocation, isLoading: isLoadingLocation } = useGeolocation()

  // State
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)

  // Route analysis
  const placeId = location.pathname.startsWith('/places/') ? params.id || null : null
  const listId = location.pathname.startsWith('/lists/') ? params.id || null : null

  // Data fetching
  const place = usePlaceData(placeId)
  const { data: currentList } = useListData(listId)

  // Map center management
  const center = useMapCenter(place || null, currentList || null, currentLocation)

  // Markers
  const markers = useMapMarkers(place || null, currentList || null, center)

  // Event handlers
  const handleMapClick = useCallback(
    (args: MapMouseEvent) => {
      const { placeId } = args.detail

      if (!placeId) return

      // Navigate directly to the place page - the loader will handle get or create
      navigate(`/places/${placeId}`)
    },
    [navigate]
  )

  const handlePlaceSelection = useCallback(
    async (prediction: GooglePlacePrediction | null) => {
      if (!prediction) return

      try {
        const placeData = await createPlaceFromPrediction(prediction)
        // Navigate to the place page instead of opening drawer
        if (placeData.id) {
          navigate(`/places/${placeData.id}`)
        } else if (placeData.googleMapsId) {
          navigate(`/places/${placeData.googleMapsId}`)
        }
      } catch (error) {
        console.error('Failed to create place from prediction:', error)
      }
    },
    [navigate]
  )

  const handleMarkerClick = useCallback(() => {
    // Marker click handling is now done in the map component itself
  }, [])

  const toggleMapFullscreen = useCallback(() => {
    setIsMapFullscreen(!isMapFullscreen)
  }, [isMapFullscreen])

  return (
    <div className="flex-1 flex flex-col lg:flex-row lg:gap-4 overflow-hidden h-full">
      {/* Content Area */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out overflow-hidden bg-white flex flex-col',
          isMapFullscreen ? 'hidden' : '',
          'lg:w-80'
        )}
      >
        {/* Search Bar - Integrated into content area */}
        <div className="py-4">
          <PlacesAutocomplete setSelected={handlePlaceSelection} />
        </div>

        {/* Content - Show list content if viewing a list */}
        <div className="overflow-y-auto flex-1">
          {currentList ? (
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4">{currentList.name}</h2>
              <div className="space-y-2">
                {currentList.places?.map((place) => (
                  <button
                    key={place.id}
                    type="button"
                    className="w-full p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 text-left"
                    onClick={() => navigate(`/places/${place.id}`)}
                  >
                    <h3 className="font-medium">{place.name}</h3>
                    <p className="text-sm text-gray-600">{place.description || 'No description'}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-4">Explore Places</h2>
              <p className="text-gray-600">
                Click on the map or search for places to discover new locations.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Map Area - Always visible */}
      <div className="flex flex-col relative flex-1 lg:h-full">
        {/* Map Controls - Mobile only */}
        <div className="md:hidden">
          <MapControls onToggleFullscreen={toggleMapFullscreen} />
        </div>

        {/* Map */}
        <div className="flex-1 min-h-0 h-full">
          <LazyMap
            isLoadingCurrentLocation={isLoadingLocation}
            zoom={ZOOM_LEVELS.DEFAULT}
            center={center}
            markers={markers}
            onMapClick={handleMapClick}
            onMarkerClick={handleMarkerClick}
          />
        </div>
      </div>
    </div>
  )
}
