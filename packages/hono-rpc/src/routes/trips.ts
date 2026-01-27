import {
  addItemToTrip,
  createTrip,
  getAllTrips,
  getTripById,
} from '@hominem/places-services';
import { NotFoundError, ValidationError, InternalError } from '@hominem/services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { authMiddleware, type AppContext } from '../middleware/auth';
import {
  tripsGetByIdSchema,
  tripsCreateInputSchema,
  tripsAddItemInputSchema,
  type TripsGetAllOutput,
  type TripsGetByIdOutput,
  type TripsCreateOutput,
  type TripsAddItemOutput,
} from '../types/trips.types';

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
// Routes
// ============================================================================

export const tripsRoutes = new Hono<AppContext>()
  // Get all trips
  .post('/list', authMiddleware, async (c) => {
    const userId = c.get('userId')!;

    const trips = await getAllTrips({ userId });

    const result = trips.map(serializeTrip);
    return c.json<TripsGetAllOutput>(result, 200);
  })

  // Get trip by ID
  .post('/get', authMiddleware, zValidator('json', tripsGetByIdSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const trip = await getTripById({ tripId: input.id, userId });

    const result = serializeTrip(trip);
    return c.json<TripsGetByIdOutput>(result, 200);
  })

  // Create trip
  .post('/create', authMiddleware, zValidator('json', tripsCreateInputSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    const newTrip = await createTrip({
      name: input.name,
      userId,
      startDate: input.startDate,
      endDate: input.endDate,
    });

    const result = serializeTrip(newTrip);
    return c.json<TripsCreateOutput>(result, 201);
  })

  // Add item to trip
  .post('/add-item', authMiddleware, zValidator('json', tripsAddItemInputSchema), async (c) => {
    const input = c.req.valid('json');

    const newTripItem = await addItemToTrip({
      tripId: input.tripId,
      itemId: input.itemId,
      day: input.day,
      order: input.order,
    });

    const result = serializeTripItem(newTripItem);
    return c.json<TripsAddItemOutput>(result, 201);
  });
