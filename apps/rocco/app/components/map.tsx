import {
  APIProvider,
  Map as GoogleMap,
  type MapEvent,
  type MapMouseEvent,
  Marker,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps'
import { useCallback, useState } from 'react'
import Alert from '~/components/alert'
import Loading from '~/components/loading'
import type { Place, PlaceLocation } from '~/lib/types'
import { cn } from '~/lib/utils'
import styles from './map.module.css'

export type RoccoMapProps = {
  isLoadingCurrentLocation: boolean
  setSelected?: (place: Place | null) => void
  zoom: number
  center: PlaceLocation
  markers: PlaceLocation[]
  onMapClick?: (event: MapMouseEvent) => void
  onMarkerClick?: () => void
}
const RoccoMap = ({
  zoom,
  center,
  isLoadingCurrentLocation,
  onMapClick,
  setSelected,
  markers,
}: RoccoMapProps) => {
  const mapsLoadingState = useApiLoadingStatus()

  // Store map center and zoom in local state, initialize from props
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
    // The Google Maps API uses a complex event structure
    // We'll need to access the map properties directly
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
        className="flex flex-1 relative overflow-hidden rounded-lg shadow-md size-full"
      >
        {isLoadingCurrentLocation ? (
          <div className="absolute left-0 right-0 mt-2 mx-auto max-w-fit z-10 p-1 px-4 rounded-lg border-blue-500 bg-blue-200 text-blue-600 text-sm">
            <span className="animate-ping inline-flex size-1 rounded-full bg-blue-800 opacity-75 mb-[2px] mr-3" />
            Loading current location
          </div>
        ) : null}
        <GoogleMap
          zoom={mapZoom}
          center={mapCenter}
          onClick={onClick}
          onIdle={handleMapIdle}
          className={cn('flex size-full', styles.map)}
        >
          {markers.map((marker) => (
            <Marker
              key={`${marker.latitude}-${marker.longitude}`}
              position={{
                lat: marker.latitude,
                lng: marker.longitude,
              }}
            />
          ))}
        </GoogleMap>
      </div>
    </APIProvider>
  )
}

export default RoccoMap
