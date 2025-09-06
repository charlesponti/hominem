import {
  type QueryClient,
  type UseMutationOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import type { AxiosError } from 'axios'
import { trpc } from './trpc/client'
import type { Place, PlaceLocation } from './types'

type AddPlaceToListOptions = {
  listIds: string[]
  place: Place
}

interface ListItem {
  id: string
  // Add other item properties as needed
}

interface ListWithItems {
  id: string
  name: string
  items?: ListItem[]
  // Add other list properties as needed
}

export const useRemoveListItem = (
  options: UseMutationOptions<
    unknown,
    AxiosError,
    { listId: string; placeId: string },
    { previousList: ListWithItems | undefined }
  >
) => {
  const queryClient = useQueryClient()
  const removeFromListMutation = trpc.items.removeFromList.useMutation()

  return useMutation<
    unknown,
    AxiosError,
    { listId: string; placeId: string },
    { previousList: ListWithItems | undefined }
  >({
    mutationKey: ['deleteListItem'],
    mutationFn: ({ listId, placeId }) => {
      return removeFromListMutation.mutateAsync({
        listId,
        itemId: placeId,
      })
    },
    onMutate: async ({ listId, placeId }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({
        queryKey: ['lists', listId],
      })

      // Snapshot the previous value
      const previousList: ListWithItems | undefined = queryClient.getQueryData(['lists', listId])

      // Optimistically update to the new value
      if (previousList) {
        queryClient.setQueryData(['lists', listId], (old: ListWithItems | undefined) => {
          if (!old || !old.items) return old
          return {
            ...old,
            items: old.items.filter((item: ListItem) => item.id !== placeId),
          }
        })
      }

      // Return context with the snapshot
      return { previousList }
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (_err, { listId }, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(['lists', listId], context.previousList)
      }
    },
    // Always refetch after error or success
    onSettled: (_, __, { listId }) => {
      queryClient.invalidateQueries({
        queryKey: ['lists', listId],
      })
      queryClient.invalidateQueries({ queryKey: ['lists'] })
    },
    ...options,
  })
}

export const useAddPlaceToList = (
  options: UseMutationOptions<unknown, AxiosError, AddPlaceToListOptions>
) => {
  const queryClient = useQueryClient()
  const createPlaceMutation = trpc.places.create.useMutation()
  const addToListMutation = trpc.items.addToList.useMutation()

  return useMutation<unknown, AxiosError, AddPlaceToListOptions>({
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
    onSuccess: (_, { listIds }) => {
      // Invalidate lists and place queries that are affected
      for (const listId of listIds) {
        queryClient.invalidateQueries({
          queryKey: ['lists', listId],
        })
      }

      queryClient.invalidateQueries({ queryKey: ['lists'] })
    },
    ...options,
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
