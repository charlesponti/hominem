import Alert from '@hominem/components/Alert'
import Loading from '@hominem/components/Loading'
import {
  Map as GoogleMap,
  type MapMouseEvent,
  useApiLoadingStatus,
} from '@vis.gl/react-google-maps'
import { useCallback } from 'react'

import type { Place, PlaceLocation } from 'src/lib/types'

import styles from './map.module.css'
import { cn } from 'src/lib/utils'

type RoccoMapProps = {
  isLoadingCurrentLocation: boolean
  setSelected: (place: Place) => void
  zoom: number
  center: PlaceLocation
  onMapClick: (event: MapMouseEvent) => void
  onMarkerClick: () => void
}
const RoccoMap = ({
  zoom,
  center,
  isLoadingCurrentLocation,
  onMapClick,
  setSelected,
}: RoccoMapProps) => {
  const mapsLoadingState = useApiLoadingStatus()
  const onClick = useCallback(
    (event: MapMouseEvent) => {
      const { placeId } = event.detail

      // Remove currently selected marker
      setSelected(null)

      // Hide info window
      if (placeId) {
        if (event?.stop) event.stop()
      }

      onMapClick(event)
    },
    [onMapClick, setSelected]
  )

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
    <div
      data-testid="rocco-map"
      data-zoom={zoom}
      data-center={JSON.stringify(center)}
      className="flex flex-1 relative overflow-hidden rounded-lg shadow-md size-full"
    >
      {isLoadingCurrentLocation ? (
        <div className="absolute left-0 right-0 mt-2 mx-auto max-w-content z-10 p-1 px-4 rounded-lg border-blue-500 bg-blue-200 text-blue-600 text-sm">
          <span className="animate-ping inline-flex size-1 rounded-full bg-blue-800 opacity-75 mb-[2px] mr-3" />
          Loading current location
        </div>
      ) : null}
      <GoogleMap
        zoom={zoom}
        center={{
          lat: center.latitude,
          lng: center.longitude,
        }}
        onClick={onClick}
        className={cn('flex size-full', styles.map)}
      />
    </div>
  )
}

export default RoccoMap
