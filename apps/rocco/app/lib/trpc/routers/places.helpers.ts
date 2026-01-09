import type { Place as PlaceSelect } from '@hominem/data/places'
import { getItemsForPlace } from '@hominem/data/places'
import { buildPhotoMediaUrl, getHominemPhotoURL } from '@hominem/utils/images'
import { getPlacePhotos as fetchGooglePlacePhotos } from '~/lib/google-places.server'
import { sanitizeStoredPhotos } from '~/lib/places-utils'
import type { Context } from '../context'

export const buildPhotoUrl = (photoRef: string) =>
  buildPhotoMediaUrl({
    key: process.env.GOOGLE_API_KEY!,
    photoName: photoRef,
  })

export const enrichPlaceWithDetails = async (_ctx: Context, dbPlace: PlaceSelect) => {
  const itemsLinkingToThisPlace = await getItemsForPlace(dbPlace.id)

  const associatedLists = itemsLinkingToThisPlace
    .map((itemRecord) => itemRecord.list)
    .filter((listRecord): listRecord is { id: string; name: string } => Boolean(listRecord))
    .map((listRecord) => ({ id: listRecord.id, name: listRecord.name }))

  let placePhotos = sanitizeStoredPhotos(dbPlace.photos)

  if (placePhotos.length === 0 && dbPlace.googleMapsId) {
    const fetchedPhotos = await fetchGooglePlacePhotos({
      placeId: dbPlace.googleMapsId,
      forceFresh: true,
    })

    if (fetchedPhotos.length > 0) {
      placePhotos = fetchedPhotos || []
    }
  }

  // Resolve photo URLs server-side so clients receive ready-to-use image URLs:
  const thumbnailPhotos = placePhotos
    .map((p) => getHominemPhotoURL(p, 800, 800))
    .filter((p): p is string => Boolean(p))

  const fullPhotos = placePhotos
    .map((p) => getHominemPhotoURL(p, 1600, 1200))
    .filter((p): p is string => Boolean(p))

  return {
    ...dbPlace,
    associatedLists,
    // photos will be the full-resolution URLs; thumbnails provided separately
    photos: fullPhotos,
    thumbnailPhotos,
  }
}
