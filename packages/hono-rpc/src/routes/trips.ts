import { addItemToTrip, createTrip, getAllTrips, getTripById } from '@hominem/places-services';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import type {
  Trip,
  TripItem,
  TripsGetAllOutput,
  TripsGetByIdOutput,
  TripsCreateOutput,
  TripsAddItemOutput,
} from '../types/trips.types';

import { authMiddleware, type AppContext } from '../middleware/auth';

/**
 * Serialize dates to ISO strings for JSON responses
 */
function serializeTrip(trip: any): Trip {
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

function serializeTripItem(item: any): TripItem {
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
 * Handles trip planning operations
 */

// ============================================================================
// Validation Schemas
// ============================================================================

const tripsGetByIdSchema = z.object({
  id: z.string().uuid(),
});

const tripsCreateSchema = z.object({
  name: z.string().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

const tripsAddItemSchema = z.object({
  tripId: z.string().uuid(),
  itemId: z.string().uuid(),
  day: z.number().optional(),
  order: z.number().optional(),
});

// ============================================================================
// Routes
// ============================================================================

export const tripsRoutes = new Hono<AppContext>()
  // Get all trips
  .post('/list', authMiddleware, async (c) => {
    const userId = c.get('userId')!;

    try {
      const trips = await getAllTrips(userId);

      const result: TripsGetAllOutput = trips.map(serializeTrip);
      return c.json(result);
    } catch (error) {
      console.error('[trips.list]', error);
      return c.json({ error: 'Failed to fetch trips' }, 500);
    }
  })

  // Get trip by ID
  .post('/get', authMiddleware, zValidator('json', tripsGetByIdSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const trip = await getTripById(input.id, userId);

      if (!trip) {
        return c.json({ error: 'Trip not found' }, 404);
      }

      const result: TripsGetByIdOutput = serializeTrip(trip);
      return c.json(result);
    } catch (error) {
      console.error('[trips.get]', error);
      return c.json({ error: 'Failed to fetch trip' }, 500);
    }
  })

  // Create trip
  .post('/create', authMiddleware, zValidator('json', tripsCreateSchema), async (c) => {
    const input = c.req.valid('json');
    const userId = c.get('userId')!;

    try {
      const newTrip = await createTrip({
        name: input.name,
        userId: userId,
        startDate: input.startDate,
        endDate: input.endDate,
      });

      if (!newTrip) {
        return c.json({ error: 'Failed to create trip' }, 500);
      }

      const result: TripsCreateOutput = serializeTrip(newTrip);
      return c.json(result);
    } catch (error) {
      console.error('[trips.create]', error);
      return c.json({ error: 'Failed to create trip' }, 500);
    }
  })

  // Add item to trip
  .post('/add-item', authMiddleware, zValidator('json', tripsAddItemSchema), async (c) => {
    const input = c.req.valid('json');

    try {
      const newTripItem = await addItemToTrip(input);

      const result: TripsAddItemOutput = serializeTripItem(newTripItem);
      return c.json(result);
    } catch (error) {
      console.error('[trips.add-item]', error);
      return c.json({ error: 'Failed to add item to trip' }, 500);
    }
  });
