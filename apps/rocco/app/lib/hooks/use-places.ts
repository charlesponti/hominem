import type { HonoMutationOptions, HonoQueryOptions } from '@hominem/hono-client/react';
import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';
import type { ListGetAllOutput, ListGetByIdOutput } from '@hominem/hono-rpc/types/lists.types';
import type {
  PlaceAddToListsInput,
  PlaceAddToListsOutput,
  PlaceRemoveFromListInput,
  PlaceRemoveFromListOutput,
  PlaceLogVisitInput,
  PlaceLogVisitOutput,
  PlaceUpdateVisitInput,
  PlaceUpdateVisitOutput,
  PlaceDeleteVisitInput,
  PlaceDeleteVisitOutput,
  PlaceAutocompleteInput,
  PlaceAutocompleteOutput,
  PlaceGetDetailsByIdInput,
  PlaceGetDetailsByIdOutput,
  PlaceGetDetailsByGoogleIdInput,
  PlaceGetDetailsByGoogleIdOutput,
  PlaceGetNearbyFromListsInput,
  PlaceGetNearbyFromListsOutput,
  PlaceGetMyVisitsInput,
  PlaceGetMyVisitsOutput,
  PlaceGetPlaceVisitsInput,
  PlaceGetPlaceVisitsOutput,
} from '@hominem/hono-rpc/types/places.types';

import { endTrace, startTrace } from '~/lib/performance/trace';
import { queryKeys } from '~/lib/query-keys';

const OPTIMISTIC_USER_ID = '00000000-0000-0000-0000-000000000000';
const OPTIMISTIC_USER_EMAIL = 'unknown@local';

const getCachedPlace = (
  utils: ReturnType<typeof useHonoUtils>,
  placeId: string,
): PlaceGetDetailsByIdOutput | null => {
  const place = utils.getData<PlaceGetDetailsByIdOutput>(queryKeys.places.get(placeId));
  return place ?? null;
};

/**
 * Create new place
 */
/**
 * Autocomplete places search
 */
export const usePlacesAutocomplete = (
  query: string | undefined,
  latitude: number | undefined,
  longitude: number | undefined,
) =>
  useHonoQuery<PlaceAutocompleteOutput>(
    queryKeys.places.autocomplete(query || '', latitude, longitude),
    async ({ places }) => {
      if (!query || query.length < 2) return [] as unknown as PlaceAutocompleteOutput;
      const input: PlaceAutocompleteInput =
        latitude && longitude
          ? { query, location: { lat: latitude, lng: longitude } }
          : { query };
      return places.autocomplete(input);
    },
    {
      enabled: !!query && query.length >= 2,
    },
  );

/**
 * Get place details by ID
 */
export const usePlaceById = (id: string | undefined) => {
  if (!id) {
    // Return a disabled query when id is undefined
    return useHonoQuery<PlaceGetDetailsByIdOutput>(
      queryKeys.places.get(''),
      async () => {
        throw new Error('Query should not be called when id is undefined');
      },
      {
        enabled: false,
      },
    );
  }

  return useHonoQuery<PlaceGetDetailsByIdOutput>(
    queryKeys.places.get(id),
    async ({ places }) => places.getById({ id } satisfies PlaceGetDetailsByIdInput),
  );
};

/**
 * Get place by Google Maps ID
 */
export const usePlaceByGoogleId = (googleMapsId: string | undefined) => {
  if (!googleMapsId) {
    // Return a disabled query when googleMapsId is undefined
    return useHonoQuery<PlaceGetDetailsByGoogleIdOutput>(
      queryKeys.places.getByGoogleId(''),
      async () => {
        throw new Error('Query should not be called when googleMapsId is undefined');
      },
      {
        enabled: false,
      },
    );
  }

  return useHonoQuery<PlaceGetDetailsByGoogleIdOutput>(
    queryKeys.places.getByGoogleId(googleMapsId),
    async ({ places }) =>
      places.getByGoogleId({ googleMapsId } satisfies PlaceGetDetailsByGoogleIdInput),
  );
};

/**
 * Add place to lists
 */
export const useAddPlaceToLists = (
  options?: HonoMutationOptions<PlaceAddToListsOutput, PlaceAddToListsInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<PlaceAddToListsOutput, PlaceAddToListsInput>(
    async ({ places }, variables) => places.addToLists(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.lists.all());
        for (const listId of variables.listIds) {
          await utils.cancel(queryKeys.lists.get(listId));
        }

        const previousLists = utils.getData<ListGetAllOutput>(queryKeys.lists.all());
        const previousListById = new Map<string, ListGetByIdOutput>();

        const place = getCachedPlace(utils, variables.placeId);
        const now = new Date().toISOString();
        const optimisticPlace = {
          id: `temp-list-place-${Date.now()}`,
          placeId: variables.placeId,
          description: place?.description ?? null,
          itemAddedAt: now,
          googleMapsId: place?.googleMapsId ?? null,
          name: place?.name ?? 'Place',
          imageUrl: place?.imageUrl ?? null,
          photos: place?.photos ?? null,
          types: place?.types ?? null,
          type: 'PLACE',
          latitude: place?.latitude ?? null,
          longitude: place?.longitude ?? null,
          rating: place?.rating ?? null,
          address: place?.address ?? null,
          addedBy: {
            id: OPTIMISTIC_USER_ID,
            name: null,
            email: OPTIMISTIC_USER_EMAIL,
            image: null,
          },
        };

        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? [];
          return existing.map((list) => {
            if (!variables.listIds.includes(list.id)) return list;
            return {
              ...list,
              places: [...list.places, optimisticPlace],
            };
          });
        });

        for (const listId of variables.listIds) {
          const list = utils.getData<ListGetByIdOutput>(queryKeys.lists.get(listId));
          if (list) {
            previousListById.set(listId, list);
            utils.setData<ListGetByIdOutput>(queryKeys.lists.get(listId), {
              ...list,
              places: [...list.places, optimisticPlace],
            });
          }
        }

        return { previousLists, previousListById };
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.places.all());
        utils.invalidate(queryKeys.lists.all());
        for (const listId of variables.listIds) {
          utils.invalidate(queryKeys.lists.get(listId));
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' && context !== null && 'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined;
        const previousListById =
          typeof context === 'object' &&
          context !== null &&
          'previousListById' in context &&
          context.previousListById instanceof Map
            ? (context as { previousListById: Map<string, ListGetByIdOutput> }).previousListById
            : null;

        if (previousLists) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), previousLists);
        }
        if (previousListById) {
          for (const [listId, list] of previousListById.entries()) {
            utils.setData<ListGetByIdOutput>(queryKeys.lists.get(listId), list);
          }
        }

        options?.onError?.(error, variables, context, mutationContext);
      },
      onSettled: (result, error, variables) => {
        utils.invalidate(queryKeys.lists.all());
        for (const listId of variables.listIds) {
          utils.invalidate(queryKeys.lists.get(listId));
        }
      },
    },
  );
};

/**
 * Remove place from list
 */
export const useRemovePlaceFromList = (
  options?: HonoMutationOptions<PlaceRemoveFromListOutput, PlaceRemoveFromListInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<PlaceRemoveFromListOutput, PlaceRemoveFromListInput>(
    async ({ places }, variables) => places.removeFromList(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.lists.all());
        await utils.cancel(queryKeys.lists.get(variables.listId));

        const previousLists = utils.getData<ListGetAllOutput>(queryKeys.lists.all());
        const previousList = utils.getData<ListGetByIdOutput>(
          queryKeys.lists.get(variables.listId),
        );

        utils.setData<ListGetAllOutput>(queryKeys.lists.all(), (old) => {
          const existing = old ?? [];
          return existing.map((list) => {
            if (list.id !== variables.listId) return list;
            return {
              ...list,
              places: list.places.filter(
                (place) => place.placeId !== variables.placeId && place.id !== variables.placeId,
              ),
            };
          });
        });

        if (previousList) {
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId), {
            ...previousList,
            places: previousList.places.filter(
              (place) => place.placeId !== variables.placeId && place.id !== variables.placeId,
            ),
          });
        }

        return { previousLists, previousList };
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.places.all());
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.lists.get(variables.listId));
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onError: (error, variables, context, mutationContext) => {
        const previousLists =
          typeof context === 'object' && context !== null && 'previousLists' in context
            ? (context as { previousLists?: ListGetAllOutput }).previousLists
            : undefined;
        const previousList =
          typeof context === 'object' && context !== null && 'previousList' in context
            ? (context as { previousList?: ListGetByIdOutput }).previousList
            : undefined;

        if (previousLists) {
          utils.setData<ListGetAllOutput>(queryKeys.lists.all(), previousLists);
        }
        if (previousList) {
          utils.setData<ListGetByIdOutput>(queryKeys.lists.get(variables.listId), previousList);
        }

        options?.onError?.(error, variables, context, mutationContext);
      },
      onSettled: (result, error, variables) => {
        utils.invalidate(queryKeys.lists.all());
        utils.invalidate(queryKeys.lists.get(variables.listId));
      },
    },
  );
};

/**
 * Get nearby places from user's lists
 */
export const useNearbyPlaces = (
  latitude: number | undefined,
  longitude: number | undefined,
  radiusMeters: number | undefined,
) =>
  useHonoQuery<PlaceGetNearbyFromListsOutput>(
    queryKeys.places.nearby(latitude, longitude, radiusMeters),
    async ({ places }) => {
      const trace = startTrace('places.nearby', {
        latitude,
        longitude,
        radiusMeters,
      });
      let responsePayload: PlaceGetNearbyFromListsOutput | null = null;
      try {
        if (latitude === undefined || longitude === undefined) {
          return [] as PlaceGetNearbyFromListsOutput;
        }

        const input: PlaceGetNearbyFromListsInput = {
          location: { lat: latitude, lng: longitude },
        };
        if (radiusMeters !== undefined) {
          input.radius = radiusMeters;
        }
        const payload = await places.getNearbyFromLists(input);
        responsePayload = payload;
        return payload;
      } finally {
        endTrace(trace, {
          resultSize: Array.isArray(responsePayload) ? responsePayload.length : 0,
        });
      }
    },
    {
      enabled: latitude !== undefined && longitude !== undefined,
    },
  );

/**
 * Log visit to a place
 */
export const useLogPlaceVisit = (
  options?: HonoMutationOptions<PlaceLogVisitOutput, PlaceLogVisitInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<PlaceLogVisitOutput, PlaceLogVisitInput>(
    async ({ places }, variables) => places.logVisit(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.places.myVisits());
        const previousMyVisits = utils.getData<PlaceGetMyVisitsOutput>(queryKeys.places.myVisits());

        const place = getCachedPlace(utils, variables.placeId);
        const now = new Date().toISOString();
        const optimisticVisit = {
          id: `temp-visit-${Date.now()}`,
          title: variables.title ?? null,
          description: variables.description ?? null,
          date: variables.date,
          placeId: variables.placeId,
          place: {
            id: place?.id ?? variables.placeId,
            name: place?.name ?? 'Place',
            address: place?.address ?? null,
            latitude: place?.latitude ?? null,
            longitude: place?.longitude ?? null,
            imageUrl: place?.imageUrl ?? null,
          },
          visitNotes: variables.visitNotes ?? null,
          visitRating: variables.visitRating ?? null,
          visitReview: variables.visitReview ?? null,
          tags: variables.tags ?? null,
          people: variables.people ?? null,
          createdAt: now,
          updatedAt: now,
        };

        utils.setData<PlaceGetMyVisitsOutput>(queryKeys.places.myVisits(), (old) => {
          const existing = old ?? [];
          return [optimisticVisit, ...existing];
        });

        return { previousMyVisits };
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.places.myVisits());
        if (result.placeId) {
          utils.invalidate(queryKeys.places.placeVisits(result.placeId));
          utils.invalidate(queryKeys.places.visitStats(result.placeId));
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onError: (error, variables, context, mutationContext) => {
        const previousMyVisits =
          typeof context === 'object' && context !== null && 'previousMyVisits' in context
            ? (context as { previousMyVisits?: PlaceGetMyVisitsOutput }).previousMyVisits
            : undefined;

        if (previousMyVisits) {
          utils.setData<PlaceGetMyVisitsOutput>(queryKeys.places.myVisits(), previousMyVisits);
        }

        options?.onError?.(error, variables, context, mutationContext);
      },
      onSettled: (result, error, variables) => {
        utils.invalidate(queryKeys.places.myVisits());
        utils.invalidate(queryKeys.places.placeVisits(variables.placeId));
        utils.invalidate(queryKeys.places.visitStats(variables.placeId));
      },
    },
  );
};

/**
 * Get user's visits
 */
export const useMyVisits = (
  input?: PlaceGetMyVisitsInput,
  options?: HonoQueryOptions<PlaceGetMyVisitsOutput>,
) =>
  useHonoQuery<PlaceGetMyVisitsOutput>(
    queryKeys.places.myVisits(input),
    async ({ places }) => places.getMyVisits(input || {}),
    options,
  );

/**
 * Get visits for a specific place
 */
export const usePlaceVisits = (placeId: string | undefined) =>
  useHonoQuery<PlaceGetPlaceVisitsOutput>(
    queryKeys.places.placeVisits(placeId || ''),
    async ({ places }) => {
      if (!placeId) return [];
      return places.getPlaceVisits({ placeId } satisfies PlaceGetPlaceVisitsInput);
    },
    {
      enabled: !!placeId,
    },
  );

/**
 * Update visit
 */
export const useUpdatePlaceVisit = (
  options?: HonoMutationOptions<PlaceUpdateVisitOutput, PlaceUpdateVisitInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<PlaceUpdateVisitOutput, PlaceUpdateVisitInput>(
    async ({ places }, variables) => places.updateVisit(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.places.myVisits());
        const previousMyVisits = utils.getData<PlaceGetMyVisitsOutput>(queryKeys.places.myVisits());

        utils.setData<PlaceGetMyVisitsOutput>(queryKeys.places.myVisits(), (old) => {
          const existing = old ?? [];
          return existing.map((visit) => {
            if (visit.id !== variables.id) {
              return visit;
            }

            return {
              ...visit,
              title: variables.title ?? visit.title,
              description: variables.description ?? visit.description,
              date: variables.date ?? visit.date,
              visitNotes: variables.visitNotes ?? visit.visitNotes,
              visitRating: variables.visitRating ?? visit.visitRating,
              visitReview: variables.visitReview ?? visit.visitReview,
              tags: variables.tags ?? visit.tags,
              people: variables.people ?? visit.people,
            };
          });
        });

        return { previousMyVisits };
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.places.myVisits());
        if (result.placeId) {
          utils.invalidate(queryKeys.places.placeVisits(result.placeId));
          utils.invalidate(queryKeys.places.visitStats(result.placeId));
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onError: (error, variables, context, mutationContext) => {
        const previousMyVisits =
          typeof context === 'object' && context !== null && 'previousMyVisits' in context
            ? (context as { previousMyVisits?: PlaceGetMyVisitsOutput }).previousMyVisits
            : undefined;

        if (previousMyVisits) {
          utils.setData<PlaceGetMyVisitsOutput>(queryKeys.places.myVisits(), previousMyVisits);
        }

        options?.onError?.(error, variables, context, mutationContext);
      },
      onSettled: () => {
        utils.invalidate(queryKeys.places.myVisits());
      },
    },
  );
};

/**
 * Delete visit
 */
export const useDeletePlaceVisit = (
  options?: HonoMutationOptions<PlaceDeleteVisitOutput, PlaceDeleteVisitInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<PlaceDeleteVisitOutput, PlaceDeleteVisitInput>(
    async ({ places }, variables) => places.deleteVisit(variables),
    {
      ...options,
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.places.myVisits());
        const previousMyVisits = utils.getData<PlaceGetMyVisitsOutput>(queryKeys.places.myVisits());

        utils.setData<PlaceGetMyVisitsOutput>(queryKeys.places.myVisits(), (old) => {
          const existing = old ?? [];
          return existing.filter((visit) => visit.id !== variables.id);
        });

        return { previousMyVisits };
      },
      onSuccess: (result, variables, context, mutationContext) => {
        utils.invalidate(queryKeys.places.myVisits());
        utils.invalidate(queryKeys.places.all());
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      onError: (error, variables, context, mutationContext) => {
        const previousMyVisits =
          typeof context === 'object' && context !== null && 'previousMyVisits' in context
            ? (context as { previousMyVisits?: PlaceGetMyVisitsOutput }).previousMyVisits
            : undefined;

        if (previousMyVisits) {
          utils.setData<PlaceGetMyVisitsOutput>(queryKeys.places.myVisits(), previousMyVisits);
        }

        options?.onError?.(error, variables, context, mutationContext);
      },
      onSettled: () => {
        utils.invalidate(queryKeys.places.myVisits());
      },
    },
  );
};

/**
 * Get visit statistics
 */
