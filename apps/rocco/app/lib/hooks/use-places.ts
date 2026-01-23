import type { HonoClient } from '@hominem/hono-client';
import type { HonoMutationOptions } from '@hominem/hono-client/react';
import type {
  PlaceCreateInput,
  PlaceCreateOutput,
  PlaceUpdateInput,
  PlaceUpdateOutput,
  PlaceDeleteInput,
  PlaceDeleteOutput,
  PlaceAutocompleteOutput,
  PlaceGetDetailsByIdOutput,
  PlaceGetDetailsByGoogleIdOutput,
  PlaceAddToListsInput,
  PlaceAddToListsOutput,
  PlaceRemoveFromListInput,
  PlaceRemoveFromListOutput,
  PlaceGetNearbyFromListsOutput,
  PlaceLogVisitInput,
  PlaceLogVisitOutput,
  PlaceGetMyVisitsOutput,
  PlaceGetPlaceVisitsOutput,
  PlaceUpdateVisitInput,
  PlaceUpdateVisitOutput,
  PlaceDeleteVisitInput,
  PlaceDeleteVisitOutput,
  PlaceGetVisitStatsOutput,
} from '@hominem/hono-rpc/types';
import type { ApiResult } from '@hominem/services';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Create new place
 */
export const useCreatePlace = (
  options?: HonoMutationOptions<ApiResult<PlaceCreateOutput>, PlaceCreateInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<PlaceCreateOutput>, PlaceCreateInput>(
    async (client: HonoClient, variables: PlaceCreateInput) => {
      const res = await client.api.places.create.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['places']);
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
  options?: HonoMutationOptions<ApiResult<PlaceUpdateOutput>, PlaceUpdateInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<PlaceUpdateOutput>, PlaceUpdateInput>(
    async (client: HonoClient, variables: PlaceUpdateInput) => {
      const res = await client.api.places.update.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['places']);
          utils.invalidate(['places', 'get', result.data.id]);
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
  options?: HonoMutationOptions<ApiResult<PlaceDeleteOutput>, PlaceDeleteInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<PlaceDeleteOutput>, PlaceDeleteInput>(
    async (client: HonoClient, variables: PlaceDeleteInput) => {
      const res = await client.api.places.delete.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['places']);
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
  useHonoQuery<ApiResult<PlaceAutocompleteOutput>>(
    ['places', 'autocomplete', query, latitude, longitude],
    async (client: HonoClient) => {
      if (!query || query.length < 2) return { success: true, data: [] };
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
  useHonoQuery<ApiResult<PlaceGetDetailsByIdOutput | null>>(
    ['places', 'get', id],
    async (client: HonoClient) => {
      if (!id) return { success: true, data: null };
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
  useHonoQuery<ApiResult<PlaceGetDetailsByGoogleIdOutput | null>>(
    ['places', 'get-by-google-id', googleMapsId],
    async (client: HonoClient) => {
      if (!googleMapsId) return { success: true, data: null };
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
  options?: HonoMutationOptions<ApiResult<PlaceAddToListsOutput>, PlaceAddToListsInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<PlaceAddToListsOutput>, PlaceAddToListsInput>(
    async (client: HonoClient, variables: PlaceAddToListsInput) => {
      const res = await client.api.places['add-to-lists'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['places']);
          utils.invalidate(['lists']);
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
  options?: HonoMutationOptions<ApiResult<PlaceRemoveFromListOutput>, PlaceRemoveFromListInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<PlaceRemoveFromListOutput>, PlaceRemoveFromListInput>(
    async (client: HonoClient, variables: PlaceRemoveFromListInput) => {
      const res = await client.api.places['remove-from-list'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['places']);
          utils.invalidate(['lists']);
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
  useHonoQuery<ApiResult<PlaceGetNearbyFromListsOutput>>(
    ['places', 'nearby', latitude, longitude, radiusMeters],
    async (client: HonoClient) => {
      if (latitude === undefined || longitude === undefined) return { success: true, data: [] };
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
export const useLogPlaceVisit = (
  options?: HonoMutationOptions<ApiResult<PlaceLogVisitOutput>, PlaceLogVisitInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<PlaceLogVisitOutput>, PlaceLogVisitInput>(
    async (client: HonoClient, variables: PlaceLogVisitInput) => {
      const res = await client.api.places['log-visit'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['places', 'my-visits']);
          if (result.data.placeId) {
            utils.invalidate(['places', 'place-visits', result.data.placeId]);
            utils.invalidate(['places', 'visit-stats', result.data.placeId]);
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
export const useMyVisits = (limit?: number, offset?: number) =>
  useHonoQuery<ApiResult<PlaceGetMyVisitsOutput>>(
    ['places', 'my-visits', limit, offset],
    async (client: HonoClient) => {
      const res = await client.api.places['my-visits'].$post({ json: { limit, offset } });
      return res.json();
    },
  );

/**
 * Get visits for a specific place
 */
export const usePlaceVisits = (placeId: string | undefined) =>
  useHonoQuery<ApiResult<PlaceGetPlaceVisitsOutput>>(
    ['places', 'place-visits', placeId],
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
  options?: HonoMutationOptions<ApiResult<PlaceUpdateVisitOutput>, PlaceUpdateVisitInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<PlaceUpdateVisitOutput>, PlaceUpdateVisitInput>(
    async (client: HonoClient, variables: PlaceUpdateVisitInput) => {
      const res = await client.api.places['update-visit'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['places', 'my-visits']);
          if (result.data.placeId) {
            utils.invalidate(['places', 'place-visits', result.data.placeId]);
            utils.invalidate(['places', 'visit-stats', result.data.placeId]);
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
  options?: HonoMutationOptions<ApiResult<PlaceDeleteVisitOutput>, PlaceDeleteVisitInput>,
) => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<PlaceDeleteVisitOutput>, PlaceDeleteVisitInput>(
    async (client: HonoClient, variables: PlaceDeleteVisitInput) => {
      const res = await client.api.places['delete-visit'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (result, variables, context, mutationContext) => {
        if (result.success) {
          utils.invalidate(['places', 'my-visits']);
          utils.invalidate(['places', 'place-visits']);
          utils.invalidate(['places', 'visit-stats']);
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
  useHonoQuery<ApiResult<PlaceGetVisitStatsOutput | null>>(
    ['places', 'visit-stats', placeId],
    async (client: HonoClient) => {
      if (!placeId) return { success: true, data: null };
      const res = await client.api.places['visit-stats'].$post({ json: { placeId } });
      return res.json();
    },
    {
      enabled: !!placeId,
    },
  );
