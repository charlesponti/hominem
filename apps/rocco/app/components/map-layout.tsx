import type { MapMouseEvent } from '@vis.gl/react-google-maps'
import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams, useMatches } from 'react-router'
import LazyMap from '~/components/map.lazy'
import PlacesAutocomplete from '~/components/places/places-autocomplete'
import { useGeolocation } from '~/hooks/useGeolocation'
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'
import type { Place } from '~/lib/types'
import { cn } from '~/lib/utils'
import { ZOOM_LEVELS } from './map-layout/constants'
import { useListData, useMapCenter, useMapMarkers, usePlaceData } from './map-layout/hooks'
import { MapControls } from './map-layout/map-controls'
import type { MapLayoutProps } from './map-layout/types'
import { createPlaceFromPrediction } from './map-layout/utils'

import { MapInteractionProvider } from '~/contexts/map-interaction-context'

export default function MapLayout({ children }: MapLayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useParams()
  const matches = useMatches()
  const { currentLocation, isLoading: isLoadingLocation } = useGeolocation()

  // State
  const [isMapFullscreen, setIsMapFullscreen] = useState(false)

  // Route analysis
  const placeId = location.pathname.startsWith('/places/') ? params.id || null : null
  const listId = location.pathname.startsWith('/lists/') ? params.id || null : null

  // Data fetching
  // Check for route data first to avoid redundant fetching
  const placeFromRoute = matches.map((match) => match.data as any).find((data) => data?.place)
    ?.place as Place | undefined

  const placeQuery = usePlaceData(placeId, { enabled: !placeFromRoute })
  const place = placeFromRoute || placeQuery

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
    <MapInteractionProvider>
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

          {/* Content */}
          <div className="overflow-y-auto flex-1">{children}</div>
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
              currentLocation={currentLocation}
              zoom={ZOOM_LEVELS.DEFAULT}
              center={center}
              markers={markers}
              onMapClick={handleMapClick}
              onMarkerClick={handleMarkerClick}
            />
          </div>
        </div>
      </div>
    </MapInteractionProvider>
  )
}
