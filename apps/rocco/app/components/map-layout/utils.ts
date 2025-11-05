import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'
import type { Place } from '~/lib/types'
import { fetchPlaceDetails } from '../../lib/fetchPlaceDetails'
import { MAX_PHOTOS } from './constants'

export async function createPlaceFromPrediction(prediction: GooglePlacePrediction): Promise<Place> {
  let photoUrls: string[] = []

  try {
    const details = await fetchPlaceDetails(prediction.place_id)
    photoUrls = details.photoUrls.slice(0, MAX_PHOTOS)
  } catch (error) {
    console.warn('Failed to fetch place details:', error)
  }

  return {
    id: prediction.place_id,
    name: prediction.structured_formatting?.main_text || prediction.description || '',
    description: null,
    address: prediction.description || '',
    createdAt: '',
    updatedAt: '',
    userId: '',
    itemId: null,
    googleMapsId: prediction.place_id,
    types: null,
    imageUrl: photoUrls[0] || null,
    phoneNumber: null,
    rating: null,
    websiteUri: null,
    latitude: null,
    longitude: null,
    location: [0, 0],
    bestFor: null,
    isPublic: false,
    wifiInfo: null,
    photos: photoUrls,
    priceLevel: null,
  }
}
