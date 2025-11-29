import axios from 'axios'

interface GooglePlacePhoto {
  photo_reference: string
}

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY

const API_BASE_URL = 'https://maps.googleapis.com/maps/api/place'

export async function fetchPlacePhotos(placeId: string): Promise<{ photoUrls: string[] }> {
  const endpoint = `${API_BASE_URL}/details/json`
  const params = {
    place_id: placeId,
    fields: 'photo',
    key: GOOGLE_PLACES_API_KEY,
  }
  const response = await axios.get(endpoint, { params })
  const photos = response.data.result?.photos || []
  const photoParams = new URLSearchParams({
    maxwidth: '800',
    key: GOOGLE_PLACES_API_KEY,
  })
  const photoUrls = photos.slice(0, 5).map((photo: GooglePlacePhoto) => {
    photoParams.set('photoreference', photo.photo_reference)
    return `${API_BASE_URL}/photo?${photoParams.toString()}`
  })
  return { photoUrls }
}
