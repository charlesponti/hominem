import axios from 'axios'

interface GooglePlacePhoto {
  photo_reference: string
}

const GOOGLE_PLACES_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY

export async function fetchPlacePhotos(placeId: string): Promise<{ photoUrls: string[] }> {
  const endpoint = 'https://maps.googleapis.com/maps/api/place/details/json'
  const params = {
    place_id: placeId,
    fields: 'photo',
    key: GOOGLE_PLACES_API_KEY,
  }
  const response = await axios.get(endpoint, { params })
  const photos = response.data.result?.photos || []
  const photoUrls = photos
    .slice(0, 5)
    .map(
      (photo: GooglePlacePhoto) =>
        `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${GOOGLE_PLACES_API_KEY}`
    )
  return { photoUrls }
}
