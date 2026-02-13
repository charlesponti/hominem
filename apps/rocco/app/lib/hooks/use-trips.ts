import type { HonoClient } from '@hominem/hono-client';
import type {
  TripsGetAllOutput,
  TripsGetByIdOutput,
  TripsCreateInput,
  TripsCreateOutput,
  TripsAddItemInput,
  TripsAddItemOutput,
} from '@hominem/hono-rpc/types/trips.types';

import { useHonoMutation, useHonoQuery, useHonoUtils } from '@hominem/hono-client/react';

import { queryKeys } from '~/lib/query-keys';

/**
 * Get all trips
 */
export const useTrips = () =>
  useHonoQuery<TripsGetAllOutput>(queryKeys.trips.all(), async (client: HonoClient) => {
    const res = await client.api.trips.list.$post({ json: {} });
    return res.json() as Promise<TripsGetAllOutput>;
  });

/**
 * Get trip by ID
 */
export const useTripById = (id: string | undefined) =>
  useHonoQuery<TripsGetByIdOutput>(
    queryKeys.trips.get(id || ''),
    async (client: HonoClient) => {
      if (!id) return null as unknown as TripsGetByIdOutput;
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
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.trips.all());
        const previousTrips = utils.getData<TripsGetAllOutput>(queryKeys.trips.all());
        const now = new Date().toISOString();
        const optimisticTrip: TripsCreateOutput = {
          id: `temp-trip-${Date.now()}`,
          name: variables.name,
          userId: '00000000-0000-0000-0000-000000000000',
          startDate: variables.startDate ? String(variables.startDate) : null,
          endDate: variables.endDate ? String(variables.endDate) : null,
          createdAt: now,
          updatedAt: now,
        };

        utils.setData<TripsGetAllOutput>(queryKeys.trips.all(), (old) => {
          const existing = old ?? [];
          return [optimisticTrip, ...existing];
        });

        return { previousTrips, optimisticId: optimisticTrip.id };
      },
      onSuccess: (_result) => {
        utils.invalidate(queryKeys.trips.all());
      },
      onError: (error, _variables, context) => {
        const previousTrips =
          typeof context === 'object' &&
          context !== null &&
          'previousTrips' in context
            ? (context as { previousTrips?: TripsGetAllOutput }).previousTrips
            : undefined;

        if (previousTrips) {
          utils.setData<TripsGetAllOutput>(queryKeys.trips.all(), previousTrips);
        }

        console.error('Failed to create trip:', error);
      },
      onSettled: () => {
        utils.invalidate(queryKeys.trips.all());
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
      onMutate: async (variables) => {
        await utils.cancel(queryKeys.trips.get(variables.tripId));
        const previousTrip = utils.getData<TripsGetByIdOutput>(
          queryKeys.trips.get(variables.tripId),
        );

        if (previousTrip) {
          utils.setData<TripsGetByIdOutput>(queryKeys.trips.get(variables.tripId), {
            ...previousTrip,
            updatedAt: new Date().toISOString(),
          });
        }

        return { previousTrip };
      },
      onSuccess: (result, variables) => {
        utils.invalidate(queryKeys.trips.get(variables.tripId));
      },
      onError: (error, variables, context) => {
        const previousTrip =
          typeof context === 'object' &&
          context !== null &&
          'previousTrip' in context
            ? (context as { previousTrip?: TripsGetByIdOutput }).previousTrip
            : undefined;

        if (previousTrip) {
          utils.setData<TripsGetByIdOutput>(queryKeys.trips.get(variables.tripId), previousTrip);
        }

        console.error('Failed to add trip item:', error);
      },
      onSettled: (_result, _error, variables) => {
        utils.invalidate(queryKeys.trips.get(variables.tripId));
      },
    },
  );
};
