import {
  addItemToTrip,
  createTrip,
  getAllTrips,
  getTripById,
  addItemToTripSchema,
  createTripSchema,
} from '@hominem/places-services';
import { error, isServiceError, success } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Serialize dates to ISO strings for JSON responses
 */
function serializeTrip(trip: any) {
  return {
    id: trip.id,
    name: trip.name,
    userId: trip.userId,
    startDate: trip.startDate
      ? trip.startDate instanceof Date
        ? trip.startDate.toISOString()
        : trip.startDate
      : null,
    endDate: trip.endDate
      ? trip.endDate instanceof Date
        ? trip.endDate.toISOString()
        : trip.endDate
      : null,
    createdAt: trip.createdAt instanceof Date ? trip.createdAt.toISOString() : trip.createdAt,
    updatedAt: trip.updatedAt instanceof Date ? trip.updatedAt.toISOString() : trip.updatedAt,
  };
}

function serializeTripItem(item: any) {
  return {
    id: item.id,
    tripId: item.tripId,
    itemId: item.itemId,
    day: item.day ?? null,
    order: item.order ?? null,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  };
}

/**
 * Trips Routes
 *
 * Handles trip planning operations using the new API contract pattern:
 * - Services throw typed errors
 * - HTTP endpoints catch errors and return ApiResult
 * - Clients receive discriminated union with `success` field
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const tripsGetByIdSchema = z.object({
  id: z.string().uuid(),
});

const tripsCreateInputSchema = z.object({
  name: z.string().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

// Export schemas for type derivation
export { tripsGetByIdSchema, tripsCreateInputSchema, createTripSchema, addItemToTripSchema };

const tripsAddItemInputSchema = z.object({
  tripId: z.string().uuid(),
  itemId: z.string().uuid(),
  day: z.number().int().optional(),
  order: z.number().int().optional(),
});

// ============================================================================
// Routes
// ============================================================================

export const tripsRoutes = new Hono<AppContext>()
  // Get all trips
  .post('/list', authMiddleware, async (c) => {
    const userId = c.get('userId')!;

    try {
      const trips = await getAllTrips({ userId });

      const result = trips.map(serializeTrip);
      return c.json(success(result), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[trips.list] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch trips'), 500);
    }
  })

  // Get trip by ID
  .post('/get', authMiddleware, zValidator('json', tripsGetByIdSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const trip = await getTripById({ tripId: input.id, userId });

      const result = serializeTrip(trip);
      return c.json(success(result), 200);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[trips.get] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to fetch trip'), 500);
    }
  })

  // Create trip
  .post('/create', authMiddleware, zValidator('json', tripsCreateInputSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const newTrip = await createTrip({
        name: input.name,
        userId,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      const result = serializeTrip(newTrip);
      return c.json(success(result), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[trips.create] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to create trip'), 500);
    }
  })

  // Add item to trip
  .post('/add-item', authMiddleware, zValidator('json', tripsAddItemInputSchema), async (c) => {
    const input = c.req.valid('json');

    try {
      const newTripItem = await addItemToTrip({
        tripId: input.tripId,
        itemId: input.itemId,
        day: input.day,
        order: input.order,
      });

      const result = serializeTripItem(newTripItem);
      return c.json(success(result), 201);
    } catch (err) {
      if (isServiceError(err)) {
        return c.json(error(err.code, err.message, err.details), err.statusCode as any);
      }

      console.error('[trips.add-item] unexpected error:', err);
      return c.json(error('INTERNAL_ERROR', 'Failed to add item to trip'), 500);
    }
  });
