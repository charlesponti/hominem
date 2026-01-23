import type {
  TripsGetAllOutput,
  TripsGetByIdInput,
  TripsGetByIdOutput,
  TripsCreateInput,
  TripsCreateOutput,
  TripsAddItemInput,
  TripsAddItemOutput,
} from '@hominem/hono-rpc/types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client';

/**
 * Get all trips
 */
export const useTrips = () =>
  useHonoQuery<TripsGetAllOutput>(['trips', 'list'], async (client) => {
    const res = await client.api.trips.list.$post({ json: {} });
    return res.json();
  });

/**
 * Get trip by ID
 */
export const useTripById = (id: string | undefined) =>
  useHonoQuery<TripsGetByIdOutput>(
    ['trips', 'get', id],
    async (client) => {
      if (!id) return null;
      const res = await client.api.trips.get.$post({ json: { id } });
      return res.json();
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
    async (client, variables) => {
      const res = await client.api.trips.create.$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: () => {
        utils.invalidate(['trips', 'list']);
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
    async (client, variables) => {
      const res = await client.api.trips['add-item'].$post({ json: variables });
      return res.json();
    },
    {
      onSuccess: (_, variables) => {
        utils.invalidate(['trips', 'get', variables.tripId]);
      },
    },
  );
};
