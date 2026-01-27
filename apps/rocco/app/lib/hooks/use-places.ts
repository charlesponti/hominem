import type { HonoClient } from '@hominem/hono-client';
import type { HonoMutationOptions, HonoQueryOptions } from '@hominem/hono-client/react';
import type {
  PlaceCreateInput,
  PlaceCreateOutput,
  PlaceUpdateInput,
  PlaceUpdateOutput,
  PlaceDeleteInput,
  PlaceDeleteOutput,
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
  PlaceAutocompleteOutput,
  PlaceGetDetailsByIdOutput,
  PlaceGetDetailsByGoogleIdOutput,
  PlaceGetNearbyFromListsOutput,
  PlaceGetMyVisitsInput,
  PlaceGetMyVisitsOutput,
  PlaceGetPlaceVisitsOutput,
  PlaceGetVisitStatsOutput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

import { queryKeys } from '~/lib/query-keys';

/**
 * Create new place
 */
export const useCreatePlace = (
  options?: HonoMutationOptions<PlaceCreateOutput, PlaceCreateInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation(
    async (client: HonoClient, variables: PlaceCreateInput) => {
      const res = await client.api.places.create.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(queryKeys.places.all() );
          utils.invalidate(queryKeys.places.get(result.data.id) );
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Update place
 */
export const useUpdatePlace = (
  options?: HonoMutationOptions<PlaceUpdateOutput, PlaceUpdateInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation(
    async (client: HonoClient, variables: PlaceUpdateInput) => {
      const res = await client.api.places.update.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(queryKeys.places.all() );
          utils.invalidate(queryKeys.places.get(result.data.id) );
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Delete place
 */
export const useDeletePlace = (
  options?: HonoMutationOptions<PlaceDeleteOutput, PlaceDeleteInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation(
    async (client: HonoClient, variables: PlaceDeleteInput) => {
      const res = await client.api.places.delete.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(queryKeys.places.all() );
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Autocomplete places search
 */
export const usePlacesAutocomplete = (
  query: string | undefined,
  latitude: number | undefined,
  longitude: number | undefined,
) =>
  useHonoQuery<PlaceAutocompleteOutput>(
    queryKeys.places.autocomplete(query || '', latitude, longitude) ,
    async (client: HonoClient) => {
      if (!query || query.length < 2)
        return { success: true, data: [] } as unknown as PlaceAutocompleteOutput;
      const res = await client.api.places.autocomplete.$post({
        json: {
          query,
          location: latitude && longitude ? { lat: latitude, lng: longitude } : undefined,
        },
      });
      return res.json() as Promise<PlaceAutocompleteOutput>;
    },
    {
      enabled: !!query && query.length >= 2,
    },
  );

/**
 * Get place details by ID
 */
export const usePlaceById = (id: string | undefined) =>
  useHonoQuery<PlaceGetDetailsByIdOutput>(
    queryKeys.places.get(id || '') ,
    async (client: HonoClient) => {
      if (!id) return { success: true, data: null } ; // Type assertion needed for null data if generic doesn't allow it easily, but ApiResult usually has data: T
      const res = await client.api.places.get.$post({ json: { id } });
      return res.json();
    },
    {
      enabled: !!id,
    },
  );

/**
 * Get place by Google Maps ID
 */
export const usePlaceByGoogleId = (googleMapsId: string | undefined) =>
  useHonoQuery<PlaceGetDetailsByGoogleIdOutput>(
    queryKeys.places.getByGoogleId(googleMapsId || '') ,
    async (client: HonoClient) => {
      if (!googleMapsId) return { success: true, data: null } ;
      const res = await client.api.places['get-by-google-id'].$post({
        json: { googleMapsId },
      });
      return res.json();
    },
    {
      enabled: !!googleMapsId,
    },
  );

/**
 * Add place to lists
 */
export const useAddPlaceToLists = (
  options?: HonoMutationOptions<PlaceAddToListsOutput, PlaceAddToListsInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation(
    async (client: HonoClient, variables: PlaceAddToListsInput) => {
      const res = await client.api.places['add-to-lists'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(queryKeys.places.all() );
          utils.invalidate(queryKeys.lists.all() );
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
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
    async (client: HonoClient, variables: PlaceRemoveFromListInput) => {
      const res = await client.api.places['remove-from-list'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(queryKeys.places.all() );
          utils.invalidate(queryKeys.lists.all() );
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
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
    queryKeys.places.nearby(latitude, longitude, radiusMeters) ,
    async (client: HonoClient) => {
      if (latitude === undefined || longitude === undefined) return { success: true, data: [] };
      const res = await client.api.places.nearby.$post({
        json: { location: { lat: latitude, lng: longitude }, radius: radiusMeters }, // Corrected structure
      });
      return res.json();
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
    async (client: HonoClient, variables: PlaceLogVisitInput) => {
      const res = await client.api.places['log-visit'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(queryKeys.places.myVisits() );
          if (result.data.placeId) {
            utils.invalidate(queryKeys.places.placeVisits(result.data.placeId) );
            utils.invalidate(queryKeys.places.visitStats(result.data.placeId) );
          }
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
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
    queryKeys.places.myVisits(input) ,
    async (client: HonoClient) => {
      const res = await client.api.places['my-visits'].$post({ json: input || {} });
      return res.json();
    },
    options,
  );

/**
 * Get visits for a specific place
 */
export const usePlaceVisits = (placeId: string | undefined) =>
  useHonoQuery<PlaceGetPlaceVisitsOutput>(
    queryKeys.places.placeVisits(placeId || '') ,
    async (client: HonoClient) => {
      if (!placeId) return { success: true, data: [] };
      const res = await client.api.places['place-visits'].$post({ json: { placeId } });
      return res.json();
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
    async (client: HonoClient, variables: PlaceUpdateVisitInput) => {
      const res = await client.api.places['update-visit'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(queryKeys.places.myVisits() );
          if (result.data.placeId) {
            utils.invalidate(queryKeys.places.placeVisits(result.data.placeId) );
            utils.invalidate(queryKeys.places.visitStats(result.data.placeId) );
          }
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
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
    async (client: HonoClient, variables: PlaceDeleteVisitInput) => {
      const res = await client.api.places['delete-visit'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(queryKeys.places.myVisits() );
          utils.invalidate(queryKeys.places.all() );
        }
        options?.onSuccess?.(result, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Get visit statistics
 */
export const usePlaceVisitStats = (placeId: string | undefined) =>
  useHonoQuery<PlaceGetVisitStatsOutput>(
    queryKeys.places.visitStats(placeId || '') ,
    async (client: HonoClient) => {
      if (!placeId) return { success: true, data: null } ;
      const res = await client.api.places['visit-stats'].$post({ json: { placeId } });
      return res.json();
    },
    {
      enabled: !!placeId,
    },
  );
