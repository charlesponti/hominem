import type { Place as DbPlaceSchema } from '@hominem/utils/types'
import type { PhotoMedia } from '../plugins/google/places.js'

export interface NormalizedListInfo {
  id: string
  name: string
}

export interface NormalizedPlaceResponse {
  id: string
  googleMapsId: string
  name: string
  address: string
  location: [number | null | undefined, number | null | undefined]
  types: string[]
  imageUrl: string | null
  websiteUri: string | null
  phoneNumber: string | null
  photos: string[]
  lists: NormalizedListInfo[]
  description: string | null
  createdAt: string | null
  updatedAt: string | null
  rating?: number | null
  isPublic?: boolean
  wifiInfo?: string | null
  bestFor?: string | null
}

// Normalize a Place (DB or PlaceInsert) for API response
export function normalizePlaceForResponse(
  place: DbPlaceSchema,
  associatedLists: NormalizedListInfo[] = [],
  fetchedPhotos: PhotoMedia[] = []
): NormalizedPlaceResponse {
  const [lon, lat] = place.location ?? [null, null]
  const photosUrls = fetchedPhotos.map((p) => p.imageUrl).filter(Boolean) as string[]

  return {
    id: place.id,
    googleMapsId: place.googleMapsId,
    name: place.name,
    address: place.address || '',
    location: [lon, lat],
    types: place.types ?? [],
    imageUrl: photosUrls[0] || place.imageUrl || null,
    websiteUri: place.websiteUri || null,
    phoneNumber: place.phoneNumber || null,
    photos: photosUrls,
    lists: associatedLists,
    description: place.description || null,
    createdAt: place.createdAt || null,
    updatedAt: place.updatedAt || null,
    rating: place.rating ?? null,
    isPublic: place.isPublic ?? false,
    wifiInfo: place.wifiInfo ?? null,
    bestFor: place.bestFor ?? null,
  }
}
