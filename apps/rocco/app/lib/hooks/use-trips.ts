import type { HonoClient } from '@hominem/hono-client';
import type {
  TripsGetAllOutput,
  TripsGetByIdOutput,
  TripsCreateInput,
  TripsCreateOutput,
  TripsAddItemInput,
  TripsAddItemOutput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

import { queryKeys } from '~/lib/query-keys';

/**
 * Get all trips
 */
export const useTrips = () =>
  useHonoQuery<TripsGetAllOutput>(queryKeys.trips.all() , async (client: HonoClient) => {
    const res = await client.api.trips.list.$post({ json: {} });
    return res.json() as Promise<TripsGetAllOutput>;
  });

/**
 * Get trip by ID
 */
export const useTripById = (id: string | undefined) =>
  useHonoQuery<TripsGetByIdOutput>(
    queryKeys.trips.get(id || '') ,
    async (client: HonoClient) => {
      if (!id) return { success: true, data: null } as unknown as TripsGetByIdOutput;
      const res = await client.api.trips.get.$post({ json: { id } });
      return res.json() as Promise<TripsGetByIdOutput>;
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
  return useHonoMutation<TripsCreateOutput, TripsCreateInput>(
    async (client: HonoClient, variables: TripsCreateInput) => {
      const res = await client.api.trips.create.$post({ json: variables });
      return res.json() as Promise<TripsCreateOutput>;
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          utils.invalidate(queryKeys.trips.all() );
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
  return useHonoMutation<TripsAddItemOutput, TripsAddItemInput>(
    async (client: HonoClient, variables: TripsAddItemInput) => {
      const res = await client.api.trips['add-item'].$post({ json: variables });
      return res.json() as Promise<TripsAddItemOutput>;
    },
    {
      onSuccess: (result, variables) => {
        if (result.success) {
          utils.invalidate(queryKeys.trips.get(variables.tripId) );
        }
      },
    },
  );
};
