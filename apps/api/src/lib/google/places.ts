import type { places_v1 } from 'googleapis'
import fetch from 'node-fetch'
import { writeFile } from 'node:fs'
import * as path from 'node:path'

import type { PlaceInsert } from '@hominem/utils/types'
import { env } from '../env.js'

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

export const getPlacePhotos = async ({
  googleMapsId,
  limit,
}: {
  googleMapsId: string
  limit?: number
}): Promise<PhotoMedia[] | undefined> => {
  const url = `https://places.googleapis.com/v1/places/${googleMapsId}?fields=photos&key=${env.GOOGLE_API_KEY}`
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
  const url = `https://places.googleapis.com/v1/places:searchText?key=${env.GOOGLE_API_KEY}`
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
