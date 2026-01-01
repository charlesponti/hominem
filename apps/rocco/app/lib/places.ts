import type { List } from '@hominem/data'
import type { GooglePlacePrediction } from '~/hooks/useGooglePlacesAutocomplete'
import { trpc } from './trpc/client'
import type { Place, PlaceLocation } from './types'

type AddPlaceToListOptions = {
  listIds: string[]
  place: Place
}

export const useRemoveListItem = (options?: {
  onMutate?: (variables: {
    listId: string
    placeId: string
  }) =>
    | Promise<{ previousList: List | undefined | null }>
    | { previousList: List | undefined | null }
  onError?: (
    error: unknown,
    variables: { listId: string; placeId: string },
    context?: { previousList: List | undefined | null }
  ) => void
  onSuccess?: (
    data: unknown,
    variables: { listId: string; placeId: string },
    context?: { previousList: List | undefined | null }
  ) => void
  onSettled?: (
    data: unknown | undefined,
    error: unknown | null,
    variables: { listId: string; placeId: string },
    context?: { previousList: List | undefined | null }
  ) => void
}) => {
  const utils = trpc.useUtils()

  const mutation = trpc.items.removeFromList.useMutation({
    onMutate: async ({ listId, itemId: placeId }) => {
      // Cancel any outgoing refetches
      await utils.lists.getById.cancel({ id: listId })

      // Snapshot the previous value
      const previousList = utils.lists.getById.getData({ id: listId })

      // Optimistically update to the new value
      if (previousList) {
        utils.lists.getById.setData({ id: listId }, (old) => {
          if (!(old?.places)) { return old }
          return {
            ...old,
            places: old.places.filter((p) => p.placeId !== placeId),
          }
        })
      }

      // Return context with the snapshot
      const context = { previousList }
      const customContext = await options?.onMutate?.({ listId, placeId })
      return customContext ?? context
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (error, variables, context) => {
      if (context?.previousList) {
        utils.lists.getById.setData({ id: variables.listId }, context.previousList)
      }
      options?.onError?.(error, { listId: variables.listId, placeId: variables.itemId }, context)
    },
    // Always refetch after error or success
    onSettled: (data, error, variables, context) => {
      utils.lists.getById.invalidate({ id: variables.listId })
      utils.lists.getAll.invalidate()
      utils.places.getDetailsById.invalidate({ id: variables.itemId })
      // Invalidate getContainingPlace query to update PlaceLists
      utils.lists.getContainingPlace.invalidate({
        placeId: variables.itemId,
      })

      options?.onSettled?.(
        data,
        error,
        { listId: variables.listId, placeId: variables.itemId },
        context
      )
    },
    onSuccess: (data, variables, context) => {
      options?.onSuccess?.(data, { listId: variables.listId, placeId: variables.itemId }, context)
    },
  })

  // Wrap mutate and mutateAsync to transform placeId to itemId
  const mutate = (
    variables: { listId: string; placeId: string },
    mutateOptions?: Parameters<typeof mutation.mutate>[1]
  ) => {
    mutation.mutate({ listId: variables.listId, itemId: variables.placeId }, mutateOptions)
  }

  const mutateAsync = async (
    variables: { listId: string; placeId: string },
    mutateOptions?: Parameters<typeof mutation.mutateAsync>[1]
  ) => {
    return mutation.mutateAsync(
      { listId: variables.listId, itemId: variables.placeId },
      mutateOptions
    )
  }

  return {
    ...mutation,
    mutate,
    mutateAsync,
  }
}

export const useAddPlaceToList = (options?: {
  onSuccess?: (data: Place, variables: AddPlaceToListOptions, context?: unknown) => void
  onError?: (error: unknown, variables: AddPlaceToListOptions, context?: unknown) => void
  onSettled?: (
    data: Place | undefined,
    error: unknown | null,
    variables: AddPlaceToListOptions,
    context?: unknown
  ) => void
}) => {
  const utils = trpc.useUtils()
  const createPlaceMutation = trpc.places.create.useMutation({
    // Prefetch related data after successful mutation
    onSuccess: (data, tRPCVariables, context) => {
      const listIds = tRPCVariables.listIds || []
      // Invalidate lists and place queries that are affected
      for (const listId of listIds) {
        utils.lists.getById.invalidate({ id: listId })
      }

      utils.lists.getAll.invalidate()

      // Invalidate place details to update "In these lists" section
      if (tRPCVariables.googleMapsId) {
        utils.places.getDetailsByGoogleId.invalidate({
          googleMapsId: tRPCVariables.googleMapsId,
        })
        utils.lists.getContainingPlace.invalidate({
          placeId: data?.id,
          googleMapsId: tRPCVariables.googleMapsId,
        })
      }
      if (data?.id) {
        utils.places.getDetailsById.invalidate({ id: data.id })
        utils.lists.getContainingPlace.invalidate({
          placeId: data.id,
          googleMapsId: tRPCVariables.googleMapsId,
        })
      }

      // Reconstruct AddPlaceToListOptions for callback
      const reconstructedVariables: AddPlaceToListOptions = {
        listIds,
        place: {
          id: data.id,
          name: data.name,
          address: data.address ?? null,
          description: data.description ?? null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          itemId: data.itemId ?? null,
          googleMapsId: data.googleMapsId ?? '',
          types: data.types ?? null,
          imageUrl: data.imageUrl ?? null,
          phoneNumber: data.phoneNumber ?? null,
          rating: data.rating ?? null,
          websiteUri: data.websiteUri ?? null,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          location: data.location ?? [0, 0],
          bestFor: data.bestFor ?? null,
          isPublic: data.isPublic ?? false,
          wifiInfo: data.wifiInfo ?? null,
          photos: data.photos ?? [],
          priceLevel: data.priceLevel ?? null,
        },
      }
      options?.onSuccess?.(data, reconstructedVariables, context)
    },
    onError: (error, tRPCVariables, context) => {
      // Reconstruct AddPlaceToListOptions for callback
      const reconstructedVariables: AddPlaceToListOptions = {
        listIds: tRPCVariables.listIds || [],
        place: {
          id: '',
          name: tRPCVariables.name,
          address: tRPCVariables.address ?? null,
          description: null,
          createdAt: '',
          updatedAt: '',
          itemId: null,
          googleMapsId: tRPCVariables.googleMapsId ?? '',
          types: tRPCVariables.types ?? null,
          imageUrl: tRPCVariables.imageUrl ?? null,
          phoneNumber: tRPCVariables.phoneNumber ?? null,
          rating: tRPCVariables.rating ?? null,
          websiteUri: tRPCVariables.websiteUri ?? null,
          latitude: tRPCVariables.latitude ?? null,
          longitude: tRPCVariables.longitude ?? null,
          location:
            tRPCVariables.latitude && tRPCVariables.longitude
              ? [tRPCVariables.latitude, tRPCVariables.longitude]
              : [0, 0],
          bestFor: null,
          isPublic: false,
          wifiInfo: null,
          photos: tRPCVariables.photos ?? [],
          priceLevel: null,
        },
      }
      options?.onError?.(error, reconstructedVariables, context)
    },
    onSettled: (data, error, tRPCVariables, context) => {
      // Reconstruct AddPlaceToListOptions for callback
      const reconstructedVariables: AddPlaceToListOptions = {
        listIds: tRPCVariables.listIds || [],
        place: {
          id: data?.id ?? '',
          name: tRPCVariables.name,
          address: tRPCVariables.address ?? null,
          description: data?.description ?? null,
          createdAt: data?.createdAt ?? '',
          updatedAt: data?.updatedAt ?? '',
          itemId: data?.itemId ?? null,
          googleMapsId: tRPCVariables.googleMapsId ?? '',
          types: tRPCVariables.types ?? null,
          imageUrl: tRPCVariables.imageUrl ?? null,
          phoneNumber: tRPCVariables.phoneNumber ?? null,
          rating: tRPCVariables.rating ?? null,
          websiteUri: tRPCVariables.websiteUri ?? null,
          latitude: tRPCVariables.latitude ?? null,
          longitude: tRPCVariables.longitude ?? null,
          location:
            tRPCVariables.latitude && tRPCVariables.longitude
              ? [tRPCVariables.latitude, tRPCVariables.longitude]
              : [0, 0],
          bestFor: data?.bestFor ?? null,
          isPublic: data?.isPublic ?? false,
          wifiInfo: data?.wifiInfo ?? null,
          photos: tRPCVariables.photos ?? [],
          priceLevel: data?.priceLevel ?? null,
        },
      }
      options?.onSettled?.(data, error, reconstructedVariables, context)
    },
  })

  // Create wrapper functions that transform AddPlaceToListOptions to tRPC input format
  const mutate = (
    variables: AddPlaceToListOptions,
    mutateOptions?: Parameters<typeof createPlaceMutation.mutate>[1]
  ) => {
    if (!variables.place.googleMapsId) {
      throw new Error('googleMapsId is required')
    }

    createPlaceMutation.mutate(
      {
        name: variables.place.name,
        address: variables.place.address || undefined,
        latitude: variables.place.latitude || undefined,
        longitude: variables.place.longitude || undefined,
        imageUrl: variables.place.imageUrl || undefined,
        googleMapsId: variables.place.googleMapsId,
        rating: variables.place.rating || undefined,
        types: variables.place.types || undefined,
        websiteUri: variables.place.websiteUri || undefined,
        phoneNumber: variables.place.phoneNumber || undefined,
        photos: variables.place.photos || undefined,
        listIds: variables.listIds,
      },
      mutateOptions
    )
  }

  const mutateAsync = async (
    variables: AddPlaceToListOptions,
    mutateOptions?: Parameters<typeof createPlaceMutation.mutateAsync>[1]
  ) => {
    if (!variables.place.googleMapsId) {
      throw new Error('googleMapsId is required')
    }

    return createPlaceMutation.mutateAsync(
      {
        name: variables.place.name,
        address: variables.place.address || undefined,
        latitude: variables.place.latitude || undefined,
        longitude: variables.place.longitude || undefined,
        imageUrl: variables.place.imageUrl || undefined,
        googleMapsId: variables.place.googleMapsId,
        rating: variables.place.rating || undefined,
        types: variables.place.types || undefined,
        websiteUri: variables.place.websiteUri || undefined,
        phoneNumber: variables.place.phoneNumber || undefined,
        photos: variables.place.photos || undefined,
        listIds: variables.listIds,
      },
      mutateOptions
    )
  }

  return {
    ...createPlaceMutation,
    mutate,
    mutateAsync,
  }
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
