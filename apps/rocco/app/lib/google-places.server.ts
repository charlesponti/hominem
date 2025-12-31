import type { GooglePlaceDetailsResponse, GooglePlacesApiResponse } from '~/lib/types'

type CacheEntry<T> = {
  value: T
  expiresAt: number
}

type GoogleRequestOptions = {
  path: string
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
  fieldMask?: string
  searchParams?: Record<string, string | number | undefined>
  cacheKey?: string
  cacheTtlMs?: number
  forceFresh?: boolean
}

export type SearchPlacesOptions = {
  query: string
  locationBias?: {
    latitude: number
    longitude: number
    radius: number
  }
  fieldMask?: string
  maxResultCount?: number
  forceFresh?: boolean
}

export type PlaceDetailsOptions = {
  placeId: string
  fieldMask?: string
  forceFresh?: boolean
}

export type PlacePhotosOptions = {
  placeId: string
  limit?: number
  forceFresh?: boolean
}

const GOOGLE_PLACES_BASE_URL = 'https://places.googleapis.com/v1'
const DEFAULT_CACHE_TTL_MS = 1000 * 60 * 5 // 5 minutes
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 300

// Field names without prefix (for Place Details API - single place response)
const FIELDS = {
  id: 'id',
  displayName: 'displayName',
  formattedAddress: 'formattedAddress',
  location: 'location',
  types: 'types',
  websiteUri: 'websiteUri',
  nationalPhoneNumber: 'nationalPhoneNumber',
  priceLevel: 'priceLevel',
  photos: 'photos',
  addressComponents: 'addressComponents',
} as const

// Helper to add 'places.' prefix for search endpoints
const withPlacesPrefix = (fields: string[]) => fields.map((f) => `places.${f}`).join(',')

// For search endpoints (returns places array)
const DEFAULT_SEARCH_FIELD_MASK = withPlacesPrefix([
  FIELDS.id,
  FIELDS.displayName,
  FIELDS.formattedAddress,
  FIELDS.location,
  FIELDS.types,
  FIELDS.websiteUri,
  FIELDS.nationalPhoneNumber,
])

// For place details endpoint (returns single place)
const DEFAULT_DETAILS_FIELD_MASK = [
  FIELDS.id,
  FIELDS.displayName,
  FIELDS.formattedAddress,
  FIELDS.location,
  FIELDS.types,
  FIELDS.websiteUri,
  FIELDS.nationalPhoneNumber,
  FIELDS.priceLevel,
  FIELDS.photos,
  FIELDS.addressComponents,
].join(',')

const cache = new Map<string, CacheEntry<unknown>>()

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getGoogleApiKey = () => {
  const key = process.env.GOOGLE_API_KEY ?? process.env.VITE_GOOGLE_API_KEY
  if (!key) {
    throw new Error('Google Places API key is not configured')
  }
  return key
}

const buildCacheKey = (parts: Record<string, unknown>) => {
  return JSON.stringify(parts)
}

const readCache = <T>(key: string | undefined): T | null => {
  if (!key) return null
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (entry.expiresAt < Date.now()) {
    cache.delete(key)
    return null
  }
  return entry.value
}

const writeCache = <T>(key: string | undefined, value: T, ttl = DEFAULT_CACHE_TTL_MS) => {
  if (!key) return
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl,
  })
}

const requestGoogle = async <T>({
  path,
  method = 'GET',
  body,
  fieldMask,
  searchParams,
  cacheKey,
  cacheTtlMs,
  forceFresh,
}: GoogleRequestOptions): Promise<T> => {
  const cached = !forceFresh ? readCache<T>(cacheKey) : null
  if (cached) {
    return cached
  }

  const url = new URL(`${GOOGLE_PLACES_BASE_URL}/${path}`)
  if (searchParams) {
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value === undefined || value === null) return
      url.searchParams.set(key, String(value))
    })
  }

  const headers = new Headers({
    'X-Goog-Api-Key': getGoogleApiKey(),
  })

  if (fieldMask) {
    headers.set('X-Goog-FieldMask', fieldMask)
  }

  if (method !== 'GET') {
    headers.set('Content-Type', 'application/json')
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    })

    if (response.ok) {
      const json = (await response.json()) as T
      writeCache(cacheKey, json, cacheTtlMs)
      return json
    }

    const errorPayload = await response.text()
    const isRetriable = response.status === 429 || response.status >= 500

    if (isRetriable && attempt < MAX_RETRIES) {
      await sleep(RETRY_DELAY_MS * (attempt + 1))
      continue
    }

    throw new Error(
      `Google Places API request failed: ${response.status} ${response.statusText} ${errorPayload}`
    )
  }

  throw new Error('Google Places API request exhausted retries')
}

export const getPlaceDetails = async ({
  placeId,
  fieldMask = DEFAULT_DETAILS_FIELD_MASK,
  forceFresh,
}: PlaceDetailsOptions): Promise<GooglePlaceDetailsResponse> => {
  const cacheKey = buildCacheKey({
    path: 'places-details',
    placeId,
    fieldMask,
  })

  const response = await requestGoogle<GooglePlaceDetailsResponse>({
    path: `places/${placeId}`,
    method: 'GET',
    fieldMask,
    cacheKey,
    forceFresh,
  })

  if (!response) {
    throw new Error(`Place ${placeId} not found`)
  }

  return response
}

export const searchPlaces = async ({
  query,
  locationBias,
  fieldMask = DEFAULT_SEARCH_FIELD_MASK,
  maxResultCount = 10,
  forceFresh,
}: SearchPlacesOptions): Promise<GooglePlacesApiResponse[]> => {
  const body: Record<string, unknown> = {
    textQuery: query,
    maxResultCount,
  }

  if (locationBias) {
    body.locationBias = {
      circle: {
        center: {
          latitude: locationBias.latitude,
          longitude: locationBias.longitude,
        },
        radius: locationBias.radius,
      },
    }
  }

  const cacheKey = buildCacheKey({
    path: 'search',
    query,
    locationBias,
    fieldMask,
    maxResultCount,
  })

  const response = await requestGoogle<{ places?: GooglePlacesApiResponse[] }>({
    path: 'places:searchText',
    method: 'POST',
    body,
    fieldMask,
    cacheKey,
    forceFresh,
  })

  return response.places ?? []
}

export const getPlacePhotos = async ({
  placeId,
  limit = 6,
  forceFresh,
}: PlacePhotosOptions): Promise<string[]> => {
  const details = await getPlaceDetails({
    placeId,
    fieldMask: FIELDS.photos,
    forceFresh,
  })

  const photos = details.photos ?? []
  return photos
    .map((photo) => photo.name)
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
    .slice(0, limit)
}

export const buildPhotoMediaUrl = ({
  photoName,
  maxWidthPx = 600,
  maxHeightPx = 400,
}: {
  photoName: string
  maxWidthPx?: number
  maxHeightPx?: number
}) => {
  const url = new URL(`${GOOGLE_PLACES_BASE_URL}/${photoName}/media`)
  url.searchParams.set('maxWidthPx', String(maxWidthPx))
  url.searchParams.set('maxHeightPx', String(maxHeightPx))
  url.searchParams.set('key', getGoogleApiKey())
  return url.toString()
}

export const getNeighborhoodFromAddressComponents = (
  addressComponents: GooglePlaceDetailsResponse['addressComponents']
) => {
  if (!addressComponents) return null
  const neighborhood = addressComponents.find((component) =>
    component.types.includes('neighborhood')
  )
  return neighborhood ? neighborhood.longText : null
}

export const googlePlacesTestUtils = {
  clearCache: () => cache.clear(),
}
