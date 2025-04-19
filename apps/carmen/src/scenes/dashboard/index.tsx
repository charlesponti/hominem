import styled from '@emotion/styled'
import type { MapMouseEvent } from '@vis.gl/react-google-maps'
import { useCallback, useEffect, useState } from 'react'
import { generatePath, useNavigate } from 'react-router-dom'

import Lists from 'src/components/Lists'
import RoccoMap from 'src/components/Map'
import PlacesAutocomplete from 'src/components/PlacesAutocomplete'
import { useGetLists } from 'src/lib/api'
import { useAuth } from 'src/lib/auth'
import { PLACE } from 'src/lib/routes'
import { mediaQueries } from 'src/lib/styles'
import type { Place } from 'src/lib/types'
import { withAuth } from 'src/lib/utils'

const Wrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  height: 100%;
  padding-bottom: 32px;

  ${mediaQueries.belowMedium} {
    max-width: calc(100% - 16px);
    margin: 0 auto;
  }
`

const PlacesAutocompleteWrap = styled.div``

export const ZOOM_LEVELS = {
  DEFAULT: 10,
  SELECTED: 19,
  MARKER: 18,
}

function Dashboard() {
  const { currentLocation, user, setCurrentLocation } = useAuth()
  const [selected, setSelected] = useState<Place | null>(null)
  const [center, setCenter] = useState(currentLocation)
  const [isLoaded, setIsLoaded] = useState(false)
  const navigate = useNavigate()
  const { data, error, status: listsStatus } = useGetLists()

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  useEffect(() => {
    if (navigator.geolocation && !isLoaded) {
      navigator.geolocation.getCurrentPosition((position: GeolocationPosition) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setCurrentLocation(location)
        setCenter(location)
        setIsLoaded(true)
      })
    }
  }, [])

  const onMapClick = useCallback(
    async (args: MapMouseEvent) => {
      navigate(generatePath(PLACE, { id: args.detail.placeId }))
    },
    [navigate]
  )

  const onSelectedChanged = useCallback(
    (place: Place) => {
      navigate(generatePath(PLACE, { id: place.googleMapsId }))
    },
    [navigate]
  )

  const onMarkerClick = useCallback(() => {
    navigate(generatePath(PLACE, { id: selected.googleMapsId }))
  }, [navigate, selected])

  return (
    <Wrap data-testid="dashboard-scene">
      <PlacesAutocompleteWrap>
        <PlacesAutocomplete setSelected={onSelectedChanged} center={currentLocation} />
      </PlacesAutocompleteWrap>
      <div className="min-h-60 h-60">
        <RoccoMap
          isLoadingCurrentLocation={!currentLocation}
          zoom={ZOOM_LEVELS.DEFAULT}
          center={center}
          onMapClick={onMapClick}
          onMarkerClick={onMarkerClick}
          setSelected={setSelected}
        />
      </div>
      <Lists status={listsStatus} lists={data} error={error} currentUserEmail={user?.email} />
    </Wrap>
  )
}

export const Component = withAuth(Dashboard)
