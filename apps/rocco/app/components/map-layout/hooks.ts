import { useEffect, useState } from 'react'
import { trpc } from '~/lib/trpc/client'
import type { Place, PlaceLocation } from '~/lib/types'
import { DEFAULT_CENTER } from './constants'
import type { MapMarker } from './types'

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
  place: Place | null,
  currentList: any,
  currentLocation: PlaceLocation | null
) {
  const [center, setCenter] = useState<PlaceLocation>(DEFAULT_CENTER)

  useEffect(() => {
    if (place?.latitude && place?.longitude) {
      setCenter({ latitude: place.latitude, longitude: place.longitude })
    } else if (currentList?.places && currentList.places.length > 0) {
      const firstPlaceWithCoords = currentList.places.find((p: any) => p.latitude && p.longitude)
      if (firstPlaceWithCoords?.latitude && firstPlaceWithCoords?.longitude) {
        setCenter({
          latitude: firstPlaceWithCoords.latitude,
          longitude: firstPlaceWithCoords.longitude,
        })
      }
    } else if (currentLocation) {
      setCenter(currentLocation)
    }
  }, [place, currentList, currentLocation])

  return center
}

export function useMapMarkers(
  place: Place | null,
  currentList: any,
  center: PlaceLocation
): MapMarker[] {
  if (place?.latitude && place?.longitude) {
    return [{ latitude: place.latitude, longitude: place.longitude }]
  }

  if (currentList?.places && currentList.places.length > 0) {
    return currentList.places
      .filter((p: any) => p.latitude && p.longitude)
      .map((p: any) => ({
        latitude: p.latitude,
        longitude: p.longitude,
      }))
  }

  return [{ latitude: center.latitude, longitude: center.longitude }]
}
