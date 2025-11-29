import { type QueryClient, type UseMutationOptions, useMutation } from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import type { List } from '@hominem/data'
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
    onError: (error, variables, context) => {
      if (context?.previousList) {
        utils.lists.getById.setData({ id: variables.listId }, context.previousList)
      }
      // @ts-expect-error - options.onError signature mismatch in environment
      options?.onError?.(error, variables, context)
    },
    // Always refetch after error or success
    onSettled: (data, error, variables, context) => {
      utils.lists.getById.invalidate({ id: variables.listId })
      utils.lists.getAll.invalidate()
      utils.lists.getListOptions.invalidate()
      // Invalidate place details to update "In these lists" section
      utils.places.getDetails.invalidate({ id: variables.placeId })

      // @ts-expect-error - options.onSettled signature mismatch in environment
      options?.onSettled?.(data, error, variables, context)
    },
  })
}

export const useAddPlaceToList = (
  options: UseMutationOptions<Place, AxiosError, AddPlaceToListOptions>
) => {
  const utils = trpc.useUtils()
  const createPlaceMutation = trpc.places.create.useMutation()
  const addToListMutation = trpc.items.addToList.useMutation()

  return useMutation<Place, AxiosError, AddPlaceToListOptions>({
    ...options,
    mutationKey: ['addPlaceToList'],
    mutationFn: async ({ listIds, place }) => {
      if (!place.googleMapsId) {
        throw new Error('googleMapsId is required')
      }
      // First create the place if it doesn't exist
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
      })

      // Then add the place to all specified lists
      const promises = listIds.map((listId) =>
        addToListMutation.mutateAsync({
          listId,
          itemId: createdPlace.id,
          itemType: 'PLACE',
        })
      )

      await Promise.all(promises)
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
      utils.lists.getListOptions.invalidate()

      // Invalidate place details to update "In these lists" section
      if (variables.place.googleMapsId) {
        utils.places.getDetails.invalidate({ id: variables.place.googleMapsId })
      }
      if (data?.id) {
        utils.places.getDetails.invalidate({ id: data.id })
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
