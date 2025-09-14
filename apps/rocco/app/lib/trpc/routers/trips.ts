import { addItemToTrip, createTrip, getAllTrips, getTripById } from '@hominem/data'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { safeAsync } from '../../errors'
import { logger } from '../../logger'
import { protectedProcedure, router } from '../context'

export const tripsRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return safeAsync(
      async () => {
        if (!ctx.user) {
          throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'User not found in context',
          })
        }

        const trips = await getAllTrips(ctx.user.id)

        logger.info('Retrieved user trips', {
          userId: ctx.user.id,
          count: trips.length,
        })

        return trips
      },
      'getAll trips',
      { userId: ctx.user?.id }
    )
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return safeAsync(
        async () => {
          if (!ctx.user) {
            throw new TRPCError({
              code: 'UNAUTHORIZED',
              message: 'User not found in context',
            })
          }

          const trip = await getTripById(input.id, ctx.user.id)

          if (!trip) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Trip not found',
            })
          }

          logger.info('Retrieved trip by ID', {
            tripId: input.id,
            userId: ctx.user.id,
            itemCount: trip.items?.length || 0,
          })

          return trip
        },
        'getById trip',
        { tripId: input.id, userId: ctx.user?.id }
      )
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      try {
        const newTrip = await createTrip({
          name: input.name,
          userId: ctx.user.id,
          startDate: input.startDate,
          endDate: input.endDate,
        })

        if (!newTrip) {
          throw new Error('Failed to create trip')
        }

        logger.info('Created new trip', {
          tripId: newTrip.id,
          userId: ctx.user.id,
          name: input.name,
        })

        return newTrip
      } catch (error) {
        logger.error('Error creating trip', { error })
        throw new Error('Failed to create trip')
      }
    }),

  addItem: protectedProcedure
    .input(
      z.object({
        tripId: z.string().uuid(),
        itemId: z.string().uuid(),
        day: z.number().optional(),
        order: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error('User not found in context')
      }

      try {
        const newTripItem = await addItemToTrip(input)

        logger.info('Added item to trip', {
          tripId: input.tripId,
          itemId: input.itemId,
          userId: ctx.user.id,
        })

        return newTripItem
      } catch (error) {
        logger.error('Error adding item to trip', { error })
        throw new Error('Failed to add item to trip')
      }
    }),
})

