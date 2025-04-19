import api from './api'
import type { Place, PlaceLocation } from './types'

export type TextSearchQuery = {
  query: string
  latitude: PlaceLocation['latitude']
  longitude: PlaceLocation['longitude']
  radius: number
}

export const getPlace = async ({ googleMapsId }: { googleMapsId: string }) => {
  const response = await api.get<Place>(`/places/${googleMapsId}`)
  return response.data
}
