import type { HonoMutationOptions, HonoQueryOptions } from '@hominem/hono-client/react'
import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react'
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
} from '@hominem/hono-rpc/types/places.types'

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
  useHonoQuery<PlaceAutocompleteOutput>(
    queryKeys.places.autocomplete(query || '', latitude, longitude),
    async ({ places }) => {
      if (!query || query.length < 2) return [] as unknown as PlaceAutocompleteOutput
      const input: PlaceAutocompleteInput =
        latitude && longitude ? { query, location: { lat: latitude, lng: longitude } } : { query }
      return places.autocomplete(input)
    },
    {
      enabled: !!query && query.length >= 2,
    },
  )

export const usePlaceById = (id: string | undefined) => {
  if (!id) {
    return useHonoQuery<PlaceGetDetailsByIdOutput>(
      queryKeys.places.get(''),
      async () => {
        throw new Error('Query should not be called when id is undefined')
      },
      {
        enabled: false,
      },
    )
  }

  return useHonoQuery<PlaceGetDetailsByIdOutput>(queryKeys.places.get(id), async ({ places }) =>
    places.getById({ id } satisfies PlaceGetDetailsByIdInput),
  )
}

export const usePlaceByGoogleId = (googleMapsId: string | undefined) => {
  if (!googleMapsId) {
    return useHonoQuery<PlaceGetDetailsByGoogleIdOutput>(
      queryKeys.places.getByGoogleId(''),
      async () => {
        throw new Error('Query should not be called when googleMapsId is undefined')
      },
      {
        enabled: false,
      },
    )
  }

  return useHonoQuery<PlaceGetDetailsByGoogleIdOutput>(
    queryKeys.places.getByGoogleId(googleMapsId),
    async ({ places }) =>
      places.getByGoogleId({ googleMapsId } satisfies PlaceGetDetailsByGoogleIdInput),
  )
}

export const useNearbyPlaces = (
  latitude: number | undefined,
  longitude: number | undefined,
  radiusMeters: number | undefined,
) =>
  useHonoQuery<PlaceGetNearbyFromListsOutput>(
    queryKeys.places.nearby(latitude, longitude, radiusMeters),
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
      enabled: latitude !== undefined && longitude !== undefined,
    },
  )

export const useAddPlaceToLists = (
  options?: HonoMutationOptions<PlaceAddToListsOutput, PlaceAddToListsInput>,
) => {
  const utils = useHonoUtils()
  return useHonoMutation<PlaceAddToListsOutput, PlaceAddToListsInput>(
    async ({ places }, variables) => places.addToLists(variables),
    {
      ...options,
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.places.all())
        utils.invalidate(queryKeys.lists.all())
        for (const listId of variables.listIds) {
          utils.invalidate(queryKeys.lists.get(listId))
        }
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
    },
  )
}

export const useRemovePlaceFromList = (
  options?: HonoMutationOptions<PlaceRemoveFromListOutput, PlaceRemoveFromListInput>,
) => {
  const utils = useHonoUtils()
  return useHonoMutation<PlaceRemoveFromListOutput, PlaceRemoveFromListInput>(
    async ({ places }, variables) => places.removeFromList(variables),
    {
      ...options,
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.places.all())
        utils.invalidate(queryKeys.lists.all())
        utils.invalidate(queryKeys.lists.get(variables.listId))
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
    },
  )
}

export const useLogPlaceVisit = (
  options?: HonoMutationOptions<PlaceLogVisitOutput, PlaceLogVisitInput>,
) => {
  const utils = useHonoUtils()
  return useHonoMutation<PlaceLogVisitOutput, PlaceLogVisitInput>(
    async ({ places }, variables) => places.logVisit(variables),
    {
      ...options,
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.places.myVisits())
        if (result.placeId) {
          utils.invalidate(queryKeys.places.placeVisits(result.placeId))
        }
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
    },
  )
}

export const useMyVisits = (
  input?: PlaceGetMyVisitsInput,
  options?: HonoQueryOptions<PlaceGetMyVisitsOutput>,
) =>
  useHonoQuery<PlaceGetMyVisitsOutput>(
    queryKeys.places.myVisits(input),
    async ({ places }) => places.getMyVisits(input || {}),
    options,
  )

export const usePlaceVisits = (placeId: string | undefined) =>
  useHonoQuery<PlaceGetPlaceVisitsOutput>(
    queryKeys.places.placeVisits(placeId || ''),
    async ({ places }) => {
      if (!placeId) return []
      return places.getPlaceVisits({ placeId } satisfies PlaceGetPlaceVisitsInput)
    },
    {
      enabled: !!placeId,
    },
  )

export const useUpdatePlaceVisit = (
  options?: HonoMutationOptions<PlaceUpdateVisitOutput, PlaceUpdateVisitInput>,
) => {
  const utils = useHonoUtils()
  return useHonoMutation<PlaceUpdateVisitOutput, PlaceUpdateVisitInput>(
    async ({ places }, variables) => places.updateVisit(variables),
    {
      ...options,
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.places.myVisits())
        if (result.placeId) {
          utils.invalidate(queryKeys.places.placeVisits(result.placeId))
        }
        options?.onSuccess?.(result, variables, context, mutationContext)
      },
    },
  )
}

export const useDeletePlaceVisit = (
  options?: HonoMutationOptions<PlaceDeleteVisitOutput, PlaceDeleteVisitInput>,
) => {
  const utils = useHonoUtils()
  return useHonoMutation<PlaceDeleteVisitOutput, PlaceDeleteVisitInput>(
    async ({ places }, variables) => places.deleteVisit(variables),
    {
      ...options,
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.places.myVisits())
        utils.invalidate(queryKeys.places.all())
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
