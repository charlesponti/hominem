import { type UseMutationOptions, useMutation, useQuery } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import api from '.'
import type { Place } from '../types'

type AddPlaceToListOptions = {
  listIds: string[]
  place: Place
}

export const useRemoveListItem = (
  options: UseMutationOptions<unknown, AxiosError, { listId: string; placeId: string }>
) => {
  return useMutation<unknown, AxiosError, { listId: string; placeId: string }>({
    mutationKey: ['deleteListItem'],
    mutationFn: ({ listId, placeId }) => {
      return api.delete(`/lists/${listId}/items/${placeId}`)
    },
    ...options,
  })
}

export const useAddPlaceToList = (
  options: UseMutationOptions<unknown, AxiosError, AddPlaceToListOptions>
) => {
  return useMutation<unknown, AxiosError, AddPlaceToListOptions>({
    mutationFn: ({ listIds, place }) => {
      return api.post('/lists/place', {
        listIds,
        place: {
          name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          imageUrl: place.imageUrl,
          googleMapsId: place.googleMapsId,
          rating: place.rating,
          price_level: place.price_level,
          types: place.types,
          websiteUri: place.websiteUri,
          phoneNumber: place.phoneNumber,
        },
      })
    },
    ...options,
  })
}

export const useGetPlace = (id: string) => {
  return useQuery<Place, AxiosError>({
    queryKey: ['place', id],
    queryFn: async () => api.get(`/places/${id}`).then((res) => res.data),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

export const useGetPlaceLists = ({ placeId }: { placeId: string }) => {
  return useQuery<{ id: string; name: string }[], AxiosError>({
    queryKey: ['placeLists', placeId],
    queryFn: async () => {
      return api.get(`/places/${placeId}/lists`).then((res) => res.data)
    },
  })
}
