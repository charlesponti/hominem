import { useEffect, useState } from 'react'
import { trpc } from '~/lib/trpc/client'
import type { AppRouter } from '~/lib/trpc/router'
import type { PlaceLocation } from '~/lib/types'
import { DEFAULT_CENTER } from './constants'
import type { MapMarker } from './types'

// Type aliases derived from tRPC procedures
type PlaceData = AppRouter['places']['getById']['_def']['$types']['output']
type ListData = AppRouter['lists']['getById']['_def']['$types']['output']

export function usePlaceData(placeId: string | null) {
  const isGoogleMapsId = placeId && placeId.length <= 10

  const { data: placeByUuid } = trpc.places.getById.useQuery(
    { id: placeId || '' },
    { enabled: Boolean(placeId && !isGoogleMapsId) }
  )

  const { data: placeByGoogleId } = trpc.places.getOrCreateByGoogleMapsIdPublic.useQuery(
    { googleMapsId: placeId || '' },
    { enabled: Boolean(placeId && isGoogleMapsId) }
  )

  return placeByUuid || placeByGoogleId
}

export function useListData(listId: string | null) {
  return trpc.lists.getById.useQuery({ id: listId || '' }, { enabled: !!listId })
}

export function useMapCenter(
  place: PlaceData | null,
  currentList: ListData | null,
  currentLocation: PlaceLocation | null
) {
  const [center, setCenter] = useState<PlaceLocation>(DEFAULT_CENTER)

  useEffect(() => {
    if (place?.latitude && place?.longitude) {
      setCenter({ latitude: place.latitude, longitude: place.longitude })
    } else if (currentList?.places && currentList.places.length > 0) {
      // Note: The current tRPC service doesn't return latitude/longitude for places in lists
      // This would need to be fixed in the service layer to include coordinate data
      // For now, we'll skip setting center from list places
    } else if (currentLocation) {
      setCenter(currentLocation)
    }
  }, [place, currentList, currentLocation])

  return center
}

export function useMapMarkers(
  place: PlaceData | null,
  currentList: ListData | null,
  center: PlaceLocation
): MapMarker[] {
  if (place?.latitude && place?.longitude) {
    return [{ latitude: place.latitude, longitude: place.longitude }]
  }

  if (currentList?.places && currentList.places.length > 0) {
    // Note: The current tRPC service doesn't return latitude/longitude for places in lists
    // This would need to be fixed in the service layer to include coordinate data
    // For now, we'll return an empty array since we can't create markers without coordinates
    return []
  }

  return [{ latitude: center.latitude, longitude: center.longitude }]
}
