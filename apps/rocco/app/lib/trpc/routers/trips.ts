import { addItemToTrip, createTrip, getAllTrips, getTripById } from '@hominem/data/travel';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { safeAsync } from '../../errors';
import { logger } from '../../logger';
import { protectedProcedure, router } from '../context';

export const tripsRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return safeAsync(
      async () => {
        const trips = await getAllTrips(ctx.user.id);
        return trips;
      },
      'getAll trips',
      { userId: ctx.user?.id },
    );
  }),

  getById: protectedProcedure.input(z.object({ id: z.uuid() })).query(async ({ ctx, input }) => {
    return safeAsync(
      async () => {
        const trip = await getTripById(input.id, ctx.user.id);

        if (!trip) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Trip not found',
          });
        }

        return trip;
      },
      'trip.getById',
      { tripId: input.id, userId: ctx.user?.id },
    );
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const newTrip = await createTrip({
          name: input.name,
          userId: ctx.user.id,
          startDate: input.startDate,
          endDate: input.endDate,
        });

        if (!newTrip) {
          throw new Error('Failed to create trip');
        }

        return newTrip;
      } catch (error) {
        logger.error('Error creating trip', { error });
        throw new Error('Failed to create trip');
      }
    }),

  addItem: protectedProcedure
    .input(
      z.object({
        tripId: z.uuid(),
        itemId: z.uuid(),
        day: z.number().optional(),
        order: z.number().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const newTripItem = await addItemToTrip(input);

        return newTripItem;
      } catch (error) {
        logger.error('[trip.addItem]', { error });
        throw new Error('Failed to add item to trip');
      }
    }),
});
