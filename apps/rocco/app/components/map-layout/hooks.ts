import { useEffect, useState } from 'react'
import { trpc } from '~/lib/trpc/client'
import type { AppRouter } from '~/lib/trpc/router'
import type { PlaceLocation } from '~/lib/types'
import { DEFAULT_CENTER } from './constants'
import type { MapMarker } from './types'

// Type aliases derived from tRPC procedures
type PlaceData = AppRouter['places']['getById']['_def']['$types']['output']
type ListData = AppRouter['lists']['getById']['_def']['$types']['output']

export function usePlaceData(placeId: string | null, options?: { enabled?: boolean }) {
  const isGoogleMapsId = placeId && placeId.length <= 10
  const enabled = options?.enabled ?? true

  const { data: placeByUuid } = trpc.places.getById.useQuery(
    { id: placeId || '' },
    { enabled: Boolean(enabled && placeId && !isGoogleMapsId) }
  )

  const { data: placeByGoogleId } = trpc.places.getOrCreateByGoogleMapsIdPublic.useQuery(
    { googleMapsId: placeId || '' },
    { enabled: Boolean(enabled && placeId && isGoogleMapsId) }
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
      const firstPlaceWithLocation = currentList.places.find((p) => p.latitude && p.longitude)
      if (firstPlaceWithLocation?.latitude && firstPlaceWithLocation?.longitude) {
        setCenter({
          latitude: firstPlaceWithLocation.latitude,
          longitude: firstPlaceWithLocation.longitude,
        })
      }
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
    return currentList.places
      .filter((p) => p.latitude && p.longitude)
      .map((p) => ({
        latitude: p.latitude!,
        longitude: p.longitude!,
        id: p.itemId, // Use itemId (Place ID) for matching
        name: p.name,
        imageUrl: p.imageUrl,
      }))
  }

  return [{ latitude: center.latitude, longitude: center.longitude }]
}
