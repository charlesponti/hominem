import type { List } from '@hominem/data'
import { type QueryClient, type UseMutationOptions, useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'
import { trpc } from './trpc/client'
import type { Place, PlaceLocation } from './types'

type AddPlaceToListOptions = {
  listIds: string[]
  place: Place
}

export const useRemoveListItem = (
  options: UseMutationOptions<
    unknown,
    AxiosError,
    { listId: string; placeId: string },
    { previousList: List | undefined | null }
  >
) => {
  const utils = trpc.useUtils()
  const removeFromListMutation = trpc.items.removeFromList.useMutation()

  return useMutation<
    unknown,
    AxiosError,
    { listId: string; placeId: string },
    { previousList: List | undefined | null }
  >({
    ...options,
    mutationKey: ['deleteListItem'],
    mutationFn: ({ listId, placeId }) => {
      return removeFromListMutation.mutateAsync({
        listId,
        itemId: placeId,
      })
    },
    onMutate: async ({ listId, placeId }) => {
      // Cancel any outgoing refetches
      await utils.lists.getById.cancel({ id: listId })

      // Snapshot the previous value
      const previousList = utils.lists.getById.getData({ id: listId })

      // Optimistically update to the new value
      if (previousList) {
        utils.lists.getById.setData({ id: listId }, (old) => {
          if (!old || !old.places) return old
          return {
            ...old,
            places: old.places.filter((p) => p.itemId !== placeId),
          }
        })
      }

      // Return context with the snapshot
      return { previousList }
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (error, variables, mutateResult, context) => {
      if (mutateResult?.previousList) {
        utils.lists.getById.setData({ id: variables.listId }, mutateResult.previousList)
      }
      options?.onError?.(error, variables, mutateResult, context)
    },
    // Always refetch after error or success
    onSettled: (data, error, variables, mutateResult, context) => {
      utils.lists.getById.invalidate({ id: variables.listId })
      utils.lists.getAll.invalidate()
      utils.places.getDetailsById.invalidate({ id: variables.placeId })
      // Invalidate getContainingPlace query to update SocialProofSection
      utils.lists.getContainingPlace.invalidate({
        placeId: variables.placeId,
      })

      options?.onSettled?.(data, error, variables, mutateResult, context)
    },
  })
}

export const useAddPlaceToList = (
  options: UseMutationOptions<Place, AxiosError, AddPlaceToListOptions>
) => {
  const utils = trpc.useUtils()
  const createPlaceMutation = trpc.places.create.useMutation()

  return useMutation<Place, AxiosError, AddPlaceToListOptions>({
    ...options,
    mutationKey: ['addPlaceToList'],
    mutationFn: async ({ listIds, place }) => {
      if (!place.googleMapsId) {
        throw new Error('googleMapsId is required')
      }

      // Create the place and add to lists in one go
      const createdPlace = await createPlaceMutation.mutateAsync({
        name: place.name,
        address: place.address || undefined,
        latitude: place.latitude || undefined,
        longitude: place.longitude || undefined,
        imageUrl: place.imageUrl || undefined,
        googleMapsId: place.googleMapsId,
        rating: place.rating || undefined,
        types: place.types || undefined,
        websiteUri: place.websiteUri || undefined,
        phoneNumber: place.phoneNumber || undefined,
        photos: place.photos || undefined,
        listIds,
      })

      return createdPlace
    },
    // Prefetch related data after successful mutation
    onSuccess: (data, variables, context) => {
      const { listIds } = variables
      // Invalidate lists and place queries that are affected
      for (const listId of listIds) {
        utils.lists.getById.invalidate({ id: listId })
      }

      utils.lists.getAll.invalidate()

      // Invalidate place details to update "In these lists" section
      if (variables.place.googleMapsId) {
        utils.places.getDetailsByGoogleId.invalidate({ googleMapsId: variables.place.googleMapsId })
        utils.lists.getContainingPlace.invalidate({
          placeId: data?.id,
          googleMapsId: variables.place.googleMapsId,
        })
      }
      if (data?.id) {
        utils.places.getDetailsById.invalidate({ id: data.id })
        utils.lists.getContainingPlace.invalidate({
          placeId: data.id,
          googleMapsId: variables.place.googleMapsId,
        })
      }

      // @ts-expect-error - options.onSuccess signature mismatch in environment
      options?.onSuccess?.(data, variables, context)
    },
  })
}

export const useGetPlace = (id: string) => {
  return trpc.places.getById.useQuery(
    { id },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    }
  )
}

// TODO: Implement getWithLists in places router
export const useGetPlaceLists = () => {
  // This function needs to be implemented in the places router
  // For now, return empty data to avoid errors
  return {
    data: [],
    isLoading: false,
  }
}

// Add a prefetching function for places
export const prefetchPlace = async (queryClient: QueryClient, id: string) => {
  return queryClient.prefetchQuery({
    queryKey: ['places', id],
    queryFn: async () => {
      // This would need to be implemented with tRPC client
      // For now, we'll use the hook approach
      return null
    },
    staleTime: 2 * 60 * 1000,
  })
}

export async function createPlaceFromPrediction(prediction: GooglePlacePrediction): Promise<Place> {
  // We don't fetch photos here anymore to avoid double fetching.
  // The photos will be fetched when the user navigates to the place details page.
  const photoUrls: string[] = []

  const latitude = prediction.location?.latitude || null
  const longitude = prediction.location?.longitude || null
  const location: [number, number] = latitude && longitude ? [latitude, longitude] : [0, 0]

  return {
    id: prediction.place_id,
    name: prediction.text || '',
    description: null,
    address: prediction.address || '',
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

export type TextSearchQuery = {
  query: string
  latitude: PlaceLocation['latitude']
  longitude: PlaceLocation['longitude']
  radius: number
}

export const getPlace = async () => {
  // This function would need to be updated to use tRPC
  // For now, we'll need to find the place by googleMapsId
  // This might require adding a new tRPC procedure
  throw new Error('getPlace function needs to be updated to use tRPC')
}
