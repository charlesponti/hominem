import type { HonoClient } from '@hominem/hono-client';
import type {
  TripsGetAllOutput,
  TripsGetByIdOutput,
  TripsCreateInput,
  TripsCreateOutput,
  TripsAddItemInput,
  TripsAddItemOutput,
} from '@hominem/hono-rpc/types';
import type { ApiResult } from '@hominem/services';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

/**
 * Get all trips
 */
export const useTrips = () =>
  useHonoQuery<ApiResult<TripsGetAllOutput>>(['trips', 'list'], async (client: HonoClient) => {
    const res = await client.api.trips.list.$post({ json: {} });
    return res.json() as Promise<ApiResult<TripsGetAllOutput>>;
  });

/**
 * Get trip by ID
 */
export const useTripById = (id: string | undefined) =>
  useHonoQuery<ApiResult<any>>(
    ['trips', 'get', id],
    async (client: HonoClient) => {
      if (!id) return { success: true, data: null };
      const res = await client.api.trips.get.$post({ json: { id } });
      return res.json() as Promise<ApiResult<any>>;
    },
    {
      enabled: !!id,
    },
  );

/**
 * Create trip
 */
export const useCreateTrip = () => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<any>, TripsCreateInput>(
    async (client: HonoClient, variables: TripsCreateInput) => {
      const res = await client.api.trips.create.$post({ json: variables });
      return res.json() as Promise<ApiResult<any>>;
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          utils.invalidate(['trips', 'list']);
        }
      },
    },
  );
};

/**
 * Add item to trip
 */
export const useAddItemToTrip = () => {
  const utils = useHonoUtils();
  return useHonoMutation<ApiResult<any>, TripsAddItemInput>(
    async (client: HonoClient, variables: TripsAddItemInput) => {
      const res = await client.api.trips['add-item'].$post({ json: variables });
      return res.json() as Promise<ApiResult<any>>;
    },
    {
      onSuccess: (result, variables) => {
        if (result.success) {
          utils.invalidate(['trips', 'get', variables.tripId]);
        }
      },
    },
  );
};
