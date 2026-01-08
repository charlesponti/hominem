import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'
import { trpc } from './trpc/client'
import type { Place, PlaceLocation } from './types'

export const useRemoveListItem = (
  options?: Partial<Parameters<typeof trpc.items.removeFromList.useMutation>[0]>
) => {
  const utils = trpc.useUtils()

  const mutation = trpc.items.removeFromList.useMutation({
    onMutate: async (variables) => {
      const { listId, itemId: placeId } = variables
      // Cancel any outgoing refetches
      await utils.lists.getById.cancel({ id: listId })

      // Snapshot the previous value
      const previousList = utils.lists.getById.getData({ id: listId })

      // Optimistically update to the new value
      if (previousList) {
        utils.lists.getById.setData({ id: listId }, (old) => {
          if (!old?.places) {
            return old
          }
          return {
            ...old,
            places: old.places.filter((p) => p.placeId !== placeId),
          }
        })
      }

      // Return context with the snapshot
      return { previousList }
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (error, variables, context, mutationContext) => {
      const ctx = context as { previousList?: unknown } | undefined
      if (ctx?.previousList) {
        utils.lists.getById.setData({ id: variables.listId }, ctx.previousList)
      }
      options?.onError?.(error, variables, context, mutationContext)
    },
    // Always refetch after error or success
    onSettled: (data, error, variables, context, mutationContext) => {
      utils.lists.getById.invalidate({ id: variables.listId })
      utils.lists.getAll.invalidate()
      utils.places.getDetailsById.invalidate({ id: variables.itemId })
      // Invalidate getContainingPlace query to update PlaceLists
      utils.lists.getContainingPlace.invalidate({
        placeId: variables.itemId,
      })

      options?.onSettled?.(data, error, variables, context, mutationContext)
    },
    onSuccess: (data, variables, context, mutationContext) => {
      options?.onSuccess?.(data, variables, context, mutationContext)
    },
  })

  return mutation
}

export const useAddPlaceToList = (
  options?: Partial<Parameters<typeof trpc.places.create.useMutation>[0]>
) => {
  const utils = trpc.useUtils()
  const createPlaceMutation = trpc.places.create.useMutation({
    // Prefetch related data after successful mutation
    onSuccess: (data, variables, _context, mutationContext) => {
      const listIds = variables?.listIds || []
      // Invalidate lists and place queries that are affected
      for (const listId of listIds) {
        utils.lists.getById.invalidate({ id: listId })
      }

      utils.lists.getAll.invalidate()

      // Invalidate place details to update "In these lists" section
      if (variables?.googleMapsId) {
        utils.places.getDetailsByGoogleId.invalidate({
          googleMapsId: variables.googleMapsId,
        })
        utils.lists.getContainingPlace.invalidate({
          placeId: data?.id,
          googleMapsId: variables.googleMapsId,
        })
      }
      if (data?.id) {
        utils.places.getDetailsById.invalidate({ id: data.id })
        utils.lists.getContainingPlace.invalidate({
          placeId: data.id,
          googleMapsId: variables?.googleMapsId,
        })
      }

      options?.onSuccess?.(data, variables, undefined, mutationContext)
    },
    onError: (error, variables, _context, mutationContext) => {
      options?.onError?.(error, variables, undefined, mutationContext)
    },
    onSettled: (data, error, variables, _context, mutationContext) => {
      options?.onSettled?.(data, error, variables, undefined, mutationContext)
    },
  })

  return createPlaceMutation
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
    businessStatus: null,
    openingHours: null,
  }
}

export type TextSearchQuery = {
  query: string
  latitude: PlaceLocation['latitude']
  longitude: PlaceLocation['longitude']
  radius: number
}
