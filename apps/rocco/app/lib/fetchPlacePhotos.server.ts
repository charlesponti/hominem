import { getPlacePhotos } from './google-places.server'

export async function fetchPlacePhotos(
  placeId: string
): Promise<{ photoUrls: string[] }> {
  const photoUrls = await getPlacePhotos({ placeId })
  return { photoUrls }
}

