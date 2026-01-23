import type { HonoMutationOptions } from '@hominem/hono-client';
import type {
  PlaceCreateInput,
  PlaceCreateOutput,
  PlaceUpdateInput,
  PlaceUpdateOutput,
  PlaceDeleteInput,
  PlaceDeleteOutput,
  PlaceAutocompleteInput,
  PlaceAutocompleteOutput,
  PlaceGetDetailsByIdInput,
  PlaceGetDetailsByIdOutput,
  PlaceGetDetailsByGoogleIdInput,
  PlaceGetDetailsByGoogleIdOutput,
  PlaceAddToListsInput,
  PlaceAddToListsOutput,
  PlaceRemoveFromListInput,
  PlaceRemoveFromListOutput,
  PlaceGetNearbyFromListsInput,
  PlaceGetNearbyFromListsOutput,
  PlaceLogVisitInput,
  PlaceLogVisitOutput,
  PlaceGetMyVisitsInput,
  PlaceGetMyVisitsOutput,
  PlaceGetPlaceVisitsInput,
  PlaceGetPlaceVisitsOutput,
  PlaceUpdateVisitInput,
  PlaceUpdateVisitOutput,
  PlaceDeleteVisitInput,
  PlaceDeleteVisitOutput,
  PlaceGetVisitStatsInput,
  PlaceGetVisitStatsOutput,
} from '@hominem/hono-rpc/types';

import { useHonoClient, useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client';

/**
 * Create new place
 */
export const useCreatePlace = (
  options?: HonoMutationOptions<PlaceCreateOutput, PlaceCreateInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<PlaceCreateOutput, PlaceCreateInput>(
    async (client, variables) => {
      const res = await client.api.places.create.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['places']);
        options?.onSuccess?.(data, variables, context, mutationContext);
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
  return useHonoMutation<PlaceUpdateOutput, PlaceUpdateInput>(
    async (client, variables) => {
      const res = await client.api.places.update.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['places']);
        utils.invalidate(['places', 'get', data.id]);
        options?.onSuccess?.(data, variables, context, mutationContext);
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
  return useHonoMutation<PlaceDeleteOutput, PlaceDeleteInput>(
    async (client, variables) => {
      const res = await client.api.places.delete.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['places']);
        options?.onSuccess?.(data, variables, context, mutationContext);
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
    ['places', 'autocomplete', query, latitude, longitude],
    async (client) => {
      if (!query || query.length < 2) return [];
      const res = await client.api.places.autocomplete.$post({
        json: { query, latitude, longitude },
      });
      return res.json();
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
    ['places', 'get', id],
    async (client) => {
      if (!id) return null;
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
    ['places', 'get-by-google-id', googleMapsId],
    async (client) => {
      if (!googleMapsId) return null;
      const res = await client.api.places['get-by-google-id'].$post({ json: { googleMapsId } });
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
  return useHonoMutation<PlaceAddToListsOutput, PlaceAddToListsInput>(
    async (client, variables) => {
      const res = await client.api.places['add-to-lists'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['places']);
        utils.invalidate(['lists']);
        options?.onSuccess?.(data, variables, context, mutationContext);
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
    async (client, variables) => {
      const res = await client.api.places['remove-from-list'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['places']);
        utils.invalidate(['lists']);
        options?.onSuccess?.(data, variables, context, mutationContext);
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
  radiusMeters?: number,
) =>
  useHonoQuery<PlaceGetNearbyFromListsOutput>(
    ['places', 'nearby', latitude, longitude, radiusMeters],
    async (client) => {
      if (latitude === undefined || longitude === undefined) return [];
      const res = await client.api.places.nearby.$post({
        json: { latitude, longitude, radiusMeters },
      });
      return res.json();
    },
    {
      enabled: latitude !== undefined && longitude !== undefined,
    },
  );

/**
 * Log visit to place
 */
export const useLogVisit = (
  options?: HonoMutationOptions<PlaceLogVisitOutput, PlaceLogVisitInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<PlaceLogVisitOutput, PlaceLogVisitInput>(
    async (client, variables) => {
      const res = await client.api.places['log-visit'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['places', 'my-visits']);
        if (data.placeId) {
          utils.invalidate(['places', 'place-visits', data.placeId]);
          utils.invalidate(['places', 'visit-stats', data.placeId]);
        }
        options?.onSuccess?.(data, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Get user's visits
 */
export const useMyVisits = (limit?: number, offset?: number) =>
  useHonoQuery<PlaceGetMyVisitsOutput>(['places', 'my-visits', limit, offset], async (client) => {
    const res = await client.api.places['my-visits'].$post({ json: { limit, offset } });
    return res.json();
  });

/**
 * Get visits for a specific place
 */
export const usePlaceVisits = (placeId: string | undefined) =>
  useHonoQuery<PlaceGetPlaceVisitsOutput>(
    ['places', 'place-visits', placeId],
    async (client) => {
      if (!placeId) return [];
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
export const useUpdateVisit = (
  options?: HonoMutationOptions<PlaceUpdateVisitOutput, PlaceUpdateVisitInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<PlaceUpdateVisitOutput, PlaceUpdateVisitInput>(
    async (client, variables) => {
      const res = await client.api.places['update-visit'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['places', 'my-visits']);
        if (data.placeId) {
          utils.invalidate(['places', 'place-visits', data.placeId]);
          utils.invalidate(['places', 'visit-stats', data.placeId]);
        }
        options?.onSuccess?.(data, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Delete visit
 */
export const useDeleteVisit = (
  options?: HonoMutationOptions<PlaceDeleteVisitOutput, PlaceDeleteVisitInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<PlaceDeleteVisitOutput, PlaceDeleteVisitInput>(
    async (client, variables) => {
      const res = await client.api.places['delete-visit'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (data, variables, context, mutationContext) => {
        utils.invalidate(['places', 'my-visits']);
        utils.invalidate(['places', 'place-visits']);
        utils.invalidate(['places', 'visit-stats']);
        options?.onSuccess?.(data, variables, context, mutationContext);
      },
      ...options,
    },
  );
};

/**
 * Get visit statistics for a place
 */
export const useVisitStats = (placeId: string | undefined) =>
  useHonoQuery<PlaceGetVisitStatsOutput>(
    ['places', 'visit-stats', placeId],
    async (client) => {
      if (!placeId) return null;
      const res = await client.api.places['visit-stats'].$post({ json: { placeId } });
      return res.json();
    },
    {
      enabled: !!placeId,
    },
  );
