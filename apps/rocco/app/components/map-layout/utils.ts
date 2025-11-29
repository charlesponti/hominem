import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'
import type { Place } from '~/lib/types'

export async function createPlaceFromPrediction(prediction: GooglePlacePrediction): Promise<Place> {
  // We don't fetch photos here anymore to avoid double fetching.
  // The photos will be fetched when the user navigates to the place details page.
  const photoUrls: string[] = []

  const latitude = prediction.location?.latitude || null
  const longitude = prediction.location?.longitude || null
  const location: [number, number] = latitude && longitude ? [latitude, longitude] : [0, 0]

  return {
    id: prediction.place_id,
    name: prediction.structured_formatting?.main_text || prediction.description || '',
    description: null,
    address: prediction.description || '',
    createdAt: '',
    updatedAt: '',
    itemId: null,
    googleMapsId: prediction.place_id,
    types: null,
    imageUrl: null,
    phoneNumber: null,
    rating: null,
    websiteUri: null,
    latitude,
    longitude,
    location,
    bestFor: null,
    isPublic: false,
    wifiInfo: null,
    photos: photoUrls,
    priceLevel: null,
  }
}
