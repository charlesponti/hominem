import { env } from '@/lib/env'
import type { place } from '@hominem/utils/schema'
import { OAuth2Client } from 'google-auth-library'
import { google, type places_v1 } from 'googleapis'
import { writeFile } from 'node:fs'
import * as path from 'node:path'
import googleService from './auth'

export const { places } = googleService.getMapsService()

export type FormattedPlace = Pick<
  typeof place.$inferInsert,
  | 'id'
  | 'address'
  | 'name'
  | 'googleMapsId'
  | 'phoneNumber'
  | 'types'
  | 'websiteUri'
  | 'latitude'
  | 'longitude'
>

const formatGooglePlace = (place: places_v1.Schema$GoogleMapsPlacesV1Place): FormattedPlace => {
  if (!place.id) {
    throw new Error('Invalid place')
  }

  return {
    address: place.adrFormatAddress || null,
    name: place.displayName?.text || 'Unknown',
    latitude: place.location?.latitude || null,
    longitude: place.location?.longitude || null,
    id: place.id,
    googleMapsId: place.id,
    phoneNumber: place.internationalPhoneNumber || null,
    types: place.types || [],
    websiteUri: place.websiteUri || null,
  }
}

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
}): Promise<FormattedPlace> {
  const response = await places.get({
    name: `places/${placeId}`,
    fields: fields.join(','),
  })

  if (!response.data || !response.data.id) {
    throw new Error('Place not found')
  }

  return formatGooglePlace(response.data)
}

export const isValidImageUrl = (url: string) => {
  return !!url && typeof url === 'string' && url.indexOf('googleusercontent') !== -1
}

export const getPlacePhotos = async ({
  googleMapsId,
  limit,
}: {
  googleMapsId: string
  limit?: number
}): Promise<PhotoMedia[] | undefined> => {
  const { data } = await places.get({
    name: `places/${googleMapsId}`,
    fields: 'photos',
  })

  if (!data) {
    console.error('Error fetching place', { googleMapsId })
    return
  }

  const { photos } = data

  if (!photos) {
    console.error('No photos found for place', { googleMapsId })
    return
  }

  return getPhotosMedia({ limit, photos })
}

export type PhotoMedia = {
  blob: places_v1.Schema$GoogleMapsPlacesV1PhotoMedia
  imageUrl: string | null
}

export async function getPhotosMedia({
  limit,
  photos,
}: {
  limit?: number
  photos: places_v1.Schema$GoogleMapsPlacesV1Photo[]
}): Promise<PhotoMedia[]> {
  return Promise.all(photos.slice(0, limit).map((photo) => getPhotoMedia(photo)))
}

export async function getPhotoMedia(photo: places_v1.Schema$GoogleMapsPlacesV1Photo) {
  const {
    data,
    request: { responseURL },
  } = await places.photos.getMedia({
    name: `${photo.name}/media`,
    maxHeightPx: 300,
  })

  return {
    blob: data,
    imageUrl: responseURL,
  }
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
    'places.id',
  ],
}: {
  fields?: PlaceFields
  query: string
  center: { latitude: number; longitude: number }
  radius: number
}) => {
  const client = google.places({
    version: 'v1',
    auth: new OAuth2Client(env.GOOGLE_CLIENT_ID, env.GOOGLE_CLIENT_SECRET, env.GOOGLE_REDIRECT_URI),
  })
  const response = await client.places.searchText({
    requestBody: {
      textQuery: query,
      locationBias: {
        circle: {
          radius,
          center,
        },
      },
      maxResultCount: 10,
    },
    fields: fields.join(','),
  })

  return response.data.places || []
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
  | 'places.plusCode'
  | 'places.primaryTypeDisplayName'
  | 'places.subDestinations'
  | 'places.types'
  | 'places.utcOffsetMinutes'
  | 'places.viewport'

type PlaceFields = PlaceField[]
