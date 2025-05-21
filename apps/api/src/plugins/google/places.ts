import type { places_v1 } from 'googleapis'
import fetch from 'node-fetch'
import assert from 'node:assert'
import { writeFile } from 'node:fs'
import * as path from 'node:path'

const { GOOGLE_API_KEY } = process.env
assert(GOOGLE_API_KEY, 'Missing Google API key')

import type { PlaceInsert } from '@hominem/utils/types'

interface PlacePhotosResponse {
  photos?: places_v1.Schema$GoogleMapsPlacesV1Photo[]
}

// Converts a Google Place API response to PlaceInsert (canonical shape for the app)
export function googlePlaceToPlaceInsert(
  place: places_v1.Schema$GoogleMapsPlacesV1Place
): PlaceInsert {
  if (!place.id) {
    throw new Error('Invalid place: missing Google place id')
  }
  return {
    userId: '',
    name: place.displayName?.text || 'Unknown',
    googleMapsId: place.id,
    address: place.adrFormatAddress || '',
    location: [place.location?.longitude ?? 0, place.location?.latitude ?? 0],
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    types: place.types || [],
    imageUrl: null,
    websiteUri: place.websiteUri || null,
    phoneNumber: place.internationalPhoneNumber || null,
    description: null,
    bestFor: null,
    wifiInfo: null,
  }
}

// Google Places API v1 does NOT support API key auth via googleapis library.
// Use direct HTTP requests for all Places API v1 endpoints.
export async function getPlaceDetails({
  placeId,
  fields = [
    'adrFormatAddress',
    'displayName',
    'location',
    'id',
    'internationalPhoneNumber',
    'types',
    'websiteUri',
    'photos',
  ],
}: {
  placeId: string
  fields?: string[]
}): Promise<PlaceInsert> {
  const url = `https://places.googleapis.com/v1/places/${placeId}?fields=${fields.join(',')}&key=${GOOGLE_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Google Places API error: ${res.status}`)
  const data = (await res.json()) as places_v1.Schema$GoogleMapsPlacesV1Place
  if (!data || !data.id) {
    throw new Error('Place not found')
  }
  return googlePlaceToPlaceInsert(data)
}

export const getPlacePhotos = async ({
  googleMapsId,
  limit,
}: {
  googleMapsId: string
  limit?: number
}): Promise<PhotoMedia[] | undefined> => {
  const url = `https://places.googleapis.com/v1/places/${googleMapsId}?fields=photos&key=${GOOGLE_API_KEY}`
  const res = await fetch(url)
  if (!res.ok) {
    console.error('Error fetching place', { googleMapsId, status: res.status })
    return
  }
  const data = (await res.json()) as PlacePhotosResponse
  const { photos } = data
  if (!photos) {
    console.error('No photos found for place', { googleMapsId })
    return
  }
  // No media blobs available from HTTP API, so just return URLs if present
  return photos
    .map((photo: places_v1.Schema$GoogleMapsPlacesV1Photo) => ({ blob: photo, imageUrl: null }))
    .slice(0, limit)
}

export const isValidImageUrl = (url: string) => {
  return !!url && typeof url === 'string' && url.indexOf('googleusercontent') !== -1
}

export type PhotoMedia = {
  blob: places_v1.Schema$GoogleMapsPlacesV1PhotoMedia
  imageUrl: string | null
}

export const downloadPlacePhotoBlob = async (blob: Blob, filename: string) => {
  const buffer = await blob.arrayBuffer()
  const bufferData = Buffer.from(buffer)
  const filePath = path.resolve(__dirname, `./public/${filename}.jpg`)

  await new Promise<void>((res, rej) =>
    writeFile(filePath, bufferData, (err) => {
      if (err) {
        console.error('Error writing file', err)
        rej(err)
      }
      res()
    })
  )
}

export const downloadPlacePhotos = async ({
  googleMapsId,
  placeId,
}: {
  googleMapsId: string
  placeId: string
}) => {
  const photos = await getPlacePhotos({
    googleMapsId,
  })
  if (photos) {
    await Promise.all(
      photos
        .filter((photo) => photo.blob)
        .map(async (photo, index) => {
          return downloadPlacePhotoBlob(photo.blob as Blob, `${placeId}-${index}`)
        })
    )
  }
}

export const searchPlaces = async ({
  query,
  center,
  radius,
  fields = [
    'places.displayName',
    'places.location',
    'places.primaryType',
    'places.shortFormattedAddress',
    'places.internationalPhoneNumber',
    'places.id',
  ],
}: {
  fields?: string[]
  query: string
  center: { latitude: number; longitude: number }
  radius: number
}): Promise<PlaceInsert[]> => {
  // Use direct HTTP request for Places API v1 searchText
  const url = `https://places.googleapis.com/v1/places:searchText?key=${process.env.GOOGLE_API_KEY}`
  const body = {
    textQuery: query,
    locationBias: {
      circle: {
        radius,
        center,
      },
    },
    fieldMask: fields.join(','), // Added fieldMask to request specific fields
    maxResultCount: 10,
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    throw new Error(`Google Places API error: ${res.status}`)
  }

  const data = (await res.json()) as places_v1.Schema$GoogleMapsPlacesV1SearchTextResponse

  if (!data.places) {
    return []
  }
  return data.places.map(googlePlaceToPlaceInsert)
}

type PlaceField =
  | 'places.displayName'
  | 'places.location'
  | 'places.primaryType'
  | 'places.shortFormattedAddress'
  | 'places.id'
  | 'places.googleMapsUri'
  | 'places.name'
  | 'places.formattedAddress'
  | 'places.accessibilityOptions'
  | 'places.addressComponents'
  | 'places.adrFormatAddress'
  | 'places.businessStatus'
  | 'places.formattedAddress'
  | 'places.iconBackgroundColor'
  | 'places.iconMaskBaseUri'
  | 'places.internationalPhoneNumber'
  | 'places.plusCode'
  | 'places.primaryTypeDisplayName'
  | 'places.subDestinations'
  | 'places.types'
  | 'places.utcOffsetMinutes'
  | 'places.viewport'
  | 'places.websiteUri'

type PlaceFields = PlaceField[]
