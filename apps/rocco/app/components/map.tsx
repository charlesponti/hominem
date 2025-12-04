import {
  APIProvider,
  Map as GoogleMap,
  InfoWindow,
  type MapEvent,
  type MapMouseEvent,
  Marker,
  useApiLoadingStatus,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps'
import { useCallback, useEffect, useState } from 'react'
import Alert from '~/components/alert'
import Loading from '~/components/loading'
import { useMapInteraction } from '~/contexts/map-interaction-context'
import type { Place, PlaceLocation } from '~/lib/types'
import { cn } from '~/lib/utils'
import styles from './map.module.css'

export type RoccoMapProps = {
  isLoadingCurrentLocation: boolean
  currentLocation?: PlaceLocation | null
  setSelected?: (place: Place | null) => void
  zoom: number
  center: PlaceLocation
  markers: PlaceLocation[]
  onMapClick?: (event: MapMouseEvent) => void
  onMarkerClick?: () => void
}

const MapUpdater = ({
  center,
  markers,
  zoom,
}: {
  center: { lat: number; lng: number }
  markers: PlaceLocation[]
  zoom: number
}) => {
  const map = useMap()
  const coreLibrary = useMapsLibrary('core')

  useEffect(() => {
    if (!map) return

    // If we have multiple markers, fit bounds
    if (markers.length > 1 && coreLibrary?.LatLngBounds) {
      const bounds = new coreLibrary.LatLngBounds()
      let hasValidMarker = false

      markers.forEach((marker) => {
        if (marker.latitude && marker.longitude) {
          bounds.extend({ lat: marker.latitude, lng: marker.longitude })
          hasValidMarker = true
        }
      })

      if (hasValidMarker) {
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 })
      }
    } else if (markers.length === 1 && markers[0].latitude && markers[0].longitude) {
      // If we have exactly one marker, center on it
      map.setCenter({ lat: markers[0].latitude, lng: markers[0].longitude })
      map.setZoom(zoom)
    } else {
      // Otherwise use the provided center
      map.setCenter(center)
      map.setZoom(zoom)
    }
  }, [map, coreLibrary, markers, center, zoom])

  return null
}

const RoccoMap = ({
  zoom,
  center,
  isLoadingCurrentLocation,
  currentLocation,
  onMapClick,
  setSelected,
  markers,
}: RoccoMapProps) => {
  const mapsLoadingState = useApiLoadingStatus()
  const { hoveredPlaceId } = useMapInteraction()
  const [selectedMarker, setSelectedMarker] = useState<PlaceLocation | null>(null)
  const markerLibrary = useMapsLibrary('marker')
  const hoverAnimation = markerLibrary?.Animation?.BOUNCE

  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: center.latitude,
    lng: center.longitude,
  })
  const [mapZoom, setMapZoom] = useState(zoom)

  const onClick = useCallback(
    (event: MapMouseEvent) => {
      const { placeId } = event.detail

      // Remove currently selected marker
      setSelected?.(null)
      setSelectedMarker(null)

      // Hide info window
      if (placeId) {
        if (event?.stop) event.stop()
      }

      onMapClick?.(event)
    },
    [onMapClick, setSelected]
  )

  // Update center/zoom on user interaction
  const handleMapIdle = (event: MapEvent<unknown>) => {
    const map = event.map
    if (map) {
      const newCenter = map.getCenter()
      const newZoom = map.getZoom()
      if (newCenter && newZoom) {
        setMapCenter({
          lat: newCenter.lat(),
          lng: newCenter.lng(),
        })
        setMapZoom(newZoom)
      }
    }
  }

  if (mapsLoadingState === 'FAILED') {
    return <Alert type="error">The Maps Library could not be loaded.</Alert>
  }

  if (mapsLoadingState === 'LOADING') {
    return (
      <div className="flex items-center justify-center max-w-[300px] mx-auto min-h-full">
        <Loading size="xl" />
      </div>
    )
  }

  return (
    <APIProvider apiKey={import.meta.env.VITE_GOOGLE_API_KEY}>
      <div
        data-testid="rocco-map"
        data-zoom={mapZoom}
        data-center={JSON.stringify(mapCenter)}
        className="flex flex-1 relative overflow-hidden rounded-lg shadow-2xl size-full"
      >
        {isLoadingCurrentLocation ? (
          <div className="absolute left-0 right-0 mt-2 mx-auto max-w-fit z-10 p-1 px-4 rounded-lg border-blue-500 bg-blue-200 text-blue-600 text-sm">
            <span className="animate-ping inline-flex size-1 rounded-full bg-blue-800 opacity-75 mb-0.5 mr-3" />
            Loading current location
          </div>
        ) : null}
        <GoogleMap
          defaultZoom={zoom}
          defaultCenter={{ lat: center.latitude, lng: center.longitude }}
          onClick={onClick}
          onIdle={handleMapIdle}
          className={cn('flex size-full', styles.map)}
        >
          <MapUpdater
            center={{ lat: center.latitude, lng: center.longitude }}
            markers={markers}
            zoom={zoom}
          />
          {/* Current location blue dot - appears when location is loaded */}
          {currentLocation && !isLoadingCurrentLocation && (
            <Marker
              position={{ lat: currentLocation.latitude, lng: currentLocation.longitude }}
              icon={{
                url: 'data:image/svg+xml;charset=UTF-8,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8" fill="%234285F4" stroke="%23FFFFFF" stroke-width="2"/></svg>',
                scaledSize: { width: 20, height: 20 },
                anchor: { x: 10, y: 10 },
              }}
              title="Your Location"
              zIndex={100}
            />
          )}
          {markers.map((marker) => {
            const isHovered = hoveredPlaceId && marker.id === hoveredPlaceId
            const isSelected = selectedMarker?.id === marker.id

            const animation = isHovered ? hoverAnimation : undefined

            return (
              <Marker
                key={`${marker.latitude}-${marker.longitude}`}
                position={{
                  lat: marker.latitude,
                  lng: marker.longitude,
                }}
                onClick={() => setSelectedMarker(marker)}
                zIndex={isHovered || isSelected ? 50 : 1}
                animation={animation}
              />
            )
          })}
          {selectedMarker && (
            <InfoWindow
              position={{
                lat: selectedMarker.latitude,
                lng: selectedMarker.longitude,
              }}
              onCloseClick={() => setSelectedMarker(null)}
              headerContent={
                <div className="font-semibold text-sm pr-4">{selectedMarker.name || 'Place'}</div>
              }
            >
              <div className="flex flex-col gap-2 max-w-[200px]">
                {selectedMarker.imageUrl && (
                  <img
                    src={selectedMarker.imageUrl}
                    alt={selectedMarker.name}
                    className="w-full h-24 object-cover rounded-md"
                  />
                )}
                {selectedMarker.id && (
                  <a
                    href={`/places/${selectedMarker.id}`}
                    className="text-xs text-indigo-600 hover:underline mt-1"
                  >
                    View Details
                  </a>
                )}
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </div>
    </APIProvider>
  )
}

export default RoccoMap
