import { useRpcMutation, useRpcQuery } from '@hominem/rpc/react'
import { useQueryClient } from '@tanstack/react-query'
import type { QueryKey, UseMutationOptions, UseQueryOptions } from '@tanstack/react-query'
import type {
  PlaceAddToListsInput,
  PlaceAddToListsOutput,
  PlaceAutocompleteInput,
  PlaceAutocompleteOutput,
  PlaceDeleteVisitInput,
  PlaceDeleteVisitOutput,
  PlaceGetDetailsByIdInput,
  PlaceGetDetailsByIdOutput,
  PlaceGetDetailsByGoogleIdInput,
  PlaceGetDetailsByGoogleIdOutput,
  PlaceGetMyVisitsInput,
  PlaceGetMyVisitsOutput,
  PlaceGetNearbyFromListsInput,
  PlaceGetNearbyFromListsOutput,
  PlaceGetPlaceVisitsInput,
  PlaceGetPlaceVisitsOutput,
  PlaceLogVisitInput,
  PlaceLogVisitOutput,
  PlaceRemoveFromListInput,
  PlaceRemoveFromListOutput,
  PlaceUpdateVisitInput,
  PlaceUpdateVisitOutput,
} from '@hominem/rpc/types/places.types'

const queryKeys = {
  places: {
    all: () => ['places', 'all'] as const,
    get: (id: string) => ['places', 'get', id] as const,
    getByGoogleId: (googleMapsId: string) => ['places', 'getByGoogleId', googleMapsId] as const,
    autocomplete: (query: string, lat?: number, lng?: number) =>
      ['places', 'autocomplete', query, lat, lng] as const,
    nearby: (lat?: number, lng?: number, radius?: number) =>
      ['places', 'nearby', lat, lng, radius] as const,
    myVisits: (input?: PlaceGetMyVisitsInput) => ['places', 'myVisits', input] as const,
    placeVisits: (placeId: string) => ['places', 'placeVisits', placeId] as const,
    visitStats: (placeId: string) => ['places', 'visitStats', placeId] as const,
  },
  lists: {
    all: () => ['lists', 'all'] as const,
    get: (id: string) => ['lists', 'get', id] as const,
  },
}

export const usePlacesAutocomplete = (
  query: string | undefined,
  latitude: number | undefined,
  longitude: number | undefined,
) =>
  useRpcQuery(
    async ({ places }) => {
      if (!query || query.length < 2) return [] as unknown as PlaceAutocompleteOutput
      const input: PlaceAutocompleteInput =
        latitude && longitude ? { query, location: { lat: latitude, lng: longitude } } : { query }
      return places.autocomplete(input)
    },
    {
      queryKey: queryKeys.places.autocomplete(query || '', latitude, longitude),
      enabled: !!query && query.length >= 2,
    },
  )

export const usePlaceById = (id: string | undefined) => {
  if (!id) {
    return useRpcQuery(
      async () => {
        throw new Error('Query should not be called when id is undefined')
      },
      {
        queryKey: queryKeys.places.get(''),
        enabled: false,
      },
    )
  }

  return useRpcQuery(
    async ({ places }) => places.getById({ id } satisfies PlaceGetDetailsByIdInput),
    { queryKey: queryKeys.places.get(id) },
  )
}

export const usePlaceByGoogleId = (googleMapsId: string | undefined) => {
  if (!googleMapsId) {
    return useRpcQuery(
      async () => {
        throw new Error('Query should not be called when googleMapsId is undefined')
      },
      {
        queryKey: queryKeys.places.getByGoogleId(''),
        enabled: false,
      },
    )
  }

  return useRpcQuery(
    async ({ places }) =>
      places.getByGoogleId({ googleMapsId } satisfies PlaceGetDetailsByGoogleIdInput),
    { queryKey: queryKeys.places.getByGoogleId(googleMapsId) },
  )
}

export const useNearbyPlaces = (
  latitude: number | undefined,
  longitude: number | undefined,
  radiusMeters: number | undefined,
) =>
  useRpcQuery(
    async ({ places }) => {
      if (latitude === undefined || longitude === undefined) {
        return [] as PlaceGetNearbyFromListsOutput
      }

      const input: PlaceGetNearbyFromListsInput = {
        location: { lat: latitude, lng: longitude },
      }
      if (radiusMeters !== undefined) {
        input.radius = radiusMeters
      }
      return places.getNearbyFromLists(input)
    },
    {
      queryKey: queryKeys.places.nearby(latitude, longitude, radiusMeters),
      enabled: latitude !== undefined && longitude !== undefined,
    },
  )

export const useAddPlaceToLists = (
  options?: Omit<UseMutationOptions<PlaceAddToListsOutput, Error, PlaceAddToListsInput>, 'mutationFn'> & {
    invalidateKeys?: QueryKey[]
  },
) => {
  const queryClient = useQueryClient()
  return useRpcMutation<PlaceAddToListsOutput, PlaceAddToListsInput>(
    async ({ places }, variables) => places.addToLists(variables),
    {
      ...options,
      onSuccess: (result, variables, context, mutationContext) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.places.all() })
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.all() })
        for (const listId of variables.listIds) {
          queryClient.invalidateQueries({ queryKey: queryKeys.lists.get(listId) })
        }
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
    },
  )
}

export const useRemovePlaceFromList = (
  options?: Omit<
    UseMutationOptions<PlaceRemoveFromListOutput, Error, PlaceRemoveFromListInput>,
    'mutationFn'
  > & {
    invalidateKeys?: QueryKey[]
  },
) => {
  const queryClient = useQueryClient()
  return useRpcMutation<PlaceRemoveFromListOutput, PlaceRemoveFromListInput>(
    async ({ places }, variables) => places.removeFromList(variables),
    {
      ...options,
      onSuccess: (result, variables, context, mutationContext) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.places.all() })
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.all() })
        queryClient.invalidateQueries({ queryKey: queryKeys.lists.get(variables.listId) })
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
    },
  )
}

export const useLogPlaceVisit = (
  options?: Omit<UseMutationOptions<PlaceLogVisitOutput, Error, PlaceLogVisitInput>, 'mutationFn'> & {
    invalidateKeys?: QueryKey[]
  },
) => {
  const queryClient = useQueryClient()
  return useRpcMutation<PlaceLogVisitOutput, PlaceLogVisitInput>(
    async ({ places }, variables) => places.logVisit(variables),
    {
      ...options,
      onSuccess: (result, variables, context, mutationContext) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.places.myVisits() })
        if (result.placeId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.places.placeVisits(result.placeId) })
        }
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
    },
  )
}

export const useMyVisits = (
  input?: PlaceGetMyVisitsInput,
  options?: Omit<UseQueryOptions<PlaceGetMyVisitsOutput>, 'queryKey' | 'queryFn'> & {
    queryKey?: QueryKey
  },
) =>
  useRpcQuery(
    async ({ places }) => places.getMyVisits(input || {}),
    {
      queryKey: queryKeys.places.myVisits(input),
      ...options,
    },
  )

export const usePlaceVisits = (placeId: string | undefined) =>
  useRpcQuery(
    async ({ places }) => {
      if (!placeId) return []
      return places.getPlaceVisits({ placeId } satisfies PlaceGetPlaceVisitsInput)
    },
    {
      queryKey: queryKeys.places.placeVisits(placeId || ''),
      enabled: !!placeId,
    },
  )

export const useUpdatePlaceVisit = (
  options?: Omit<UseMutationOptions<PlaceUpdateVisitOutput, Error, PlaceUpdateVisitInput>, 'mutationFn'> & {
    invalidateKeys?: QueryKey[]
  },
) => {
  const queryClient = useQueryClient()
  return useRpcMutation<PlaceUpdateVisitOutput, PlaceUpdateVisitInput>(
    async ({ places }, variables) => places.updateVisit(variables),
    {
      ...options,
      onSuccess: (result, variables, context, mutationContext) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.places.myVisits() })
        if (result.placeId) {
          queryClient.invalidateQueries({ queryKey: queryKeys.places.placeVisits(result.placeId) })
        }
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
    },
  )
}

export const useDeletePlaceVisit = (
  options?: Omit<UseMutationOptions<PlaceDeleteVisitOutput, Error, PlaceDeleteVisitInput>, 'mutationFn'> & {
    invalidateKeys?: QueryKey[]
  },
) => {
  const queryClient = useQueryClient()
  return useRpcMutation<PlaceDeleteVisitOutput, PlaceDeleteVisitInput>(
    async ({ places }, variables) => places.deleteVisit(variables),
    {
      ...options,
      onSuccess: (result, variables, context, mutationContext) => {
        queryClient.invalidateQueries({ queryKey: queryKeys.places.myVisits() })
        queryClient.invalidateQueries({ queryKey: queryKeys.places.all() })
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
    },
  )
}

import type { GooglePlacePrediction } from './use-google-places-autocomplete'

export function createPlaceFromPrediction(
  prediction: GooglePlacePrediction,
): PlaceGetDetailsByIdOutput {
  const latitude = prediction.location?.latitude ?? null
  const longitude = prediction.location?.longitude ?? null

  return {
    id: prediction.place_id,
    name: prediction.text || '',
    description: null,
    address: prediction.address || null,
    createdAt: '',
    updatedAt: '',
    googleMapsId: prediction.place_id,
    types: null,
    imageUrl: null,
    phoneNumber: null,
    rating: null,
    websiteUri: null,
    latitude,
    longitude,
    photos: null,
    priceLevel: null,
    businessStatus: null,
    openingHours: null,
  }
}
