import { db } from '@hominem/db';
import { item, place, tripItems, trips } from '@hominem/db/schema';
import { NotFoundError, ValidationError, InternalError } from '@hominem/services';
import { logger } from '@hominem/utils/logger';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for creating a trip
 */
export const createTripSchema = z.object({
  name: z.string().min(1, 'Trip name is required'),
  userId: z.string().uuid('Invalid user ID'),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;

/**
 * Schema for getting all trips for a user
 */
export const getAllTripsSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type GetAllTripsInput = z.infer<typeof getAllTripsSchema>;

/**
 * Schema for getting a trip by ID
 */
export const getTripByIdSchema = z.object({
  tripId: z.string().uuid('Invalid trip ID'),
  userId: z.string().uuid('Invalid user ID'),
});

export type GetTripByIdInput = z.infer<typeof getTripByIdSchema>;

/**
 * Schema for adding an item to a trip
 */
export const addItemToTripSchema = z.object({
  tripId: z.string().uuid('Invalid trip ID'),
  itemId: z.string().uuid('Invalid item ID'),
  day: z.number().int().positive('Day must be positive').optional(),
  order: z.number().int().nonnegative('Order must be non-negative').optional(),
});

export type AddItemToTripInput = z.infer<typeof addItemToTripSchema>;

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Create a new trip for a user
 *
 * @param input - Trip creation parameters
 * @returns The created trip
 * @throws ValidationError if input is invalid
 * @throws InternalError if database operation fails
 */
export async function createTrip(input: CreateTripInput) {
  try {
    const validated = createTripSchema.parse(input);

    const [newTrip] = await db
      .insert(trips)
      .values({
        name: validated.name,
        userId: validated.userId,
        startDate: validated.startDate,
        endDate: validated.endDate,
      })
      .returning();

    if (!newTrip) {
      throw new InternalError('Failed to create trip');
    }

    return newTrip;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error(
      JSON.stringify(
        {
          message: 'Failed to create trip',
          service: 'trips.service',
          function: 'createTrip',
          userId: input.userId,
          input,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );

    throw new InternalError('Failed to create trip', {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get all trips for a user
 *
 * @param input - User ID
 * @returns Array of trips
 * @throws ValidationError if input is invalid
 */
export async function getAllTrips(input: GetAllTripsInput) {
  const validated = getAllTripsSchema.parse(input);
  return db.select().from(trips).where(eq(trips.userId, validated.userId));
}

/**
 * Get a specific trip by ID with its items
 *
 * @param input - Trip ID and user ID
 * @returns Trip with associated items, or null if not found
 * @throws NotFoundError if trip is not found
 * @throws ValidationError if input is invalid
 */
export async function getTripById(input: GetTripByIdInput) {
  const validated = getTripByIdSchema.parse(input);

  const trip = await db.query.trips.findFirst({
    where: and(eq(trips.id, validated.tripId), eq(trips.userId, validated.userId)),
  });

  if (!trip) {
    throw new NotFoundError('Trip', { tripId: validated.tripId });
  }

  const items = await db
    .select()
    .from(tripItems)
    .where(eq(tripItems.tripId, validated.tripId))
    .innerJoin(item, eq(tripItems.itemId, item.id))
    .innerJoin(place, eq(item.itemId, place.id))
    .orderBy(tripItems.day, tripItems.order);

  return { ...trip, items };
}

/**
 * Add an item to a trip
 *
 * @param input - Trip ID, item ID, and optional day/order
 * @returns The created trip item
 * @throws ValidationError if input is invalid
 * @throws InternalError if database operation fails
 */
export async function addItemToTrip(input: AddItemToTripInput) {
  try {
    const validated = addItemToTripSchema.parse(input);

    const [newTripItem] = await db
      .insert(tripItems)
      .values({
        tripId: validated.tripId,
        itemId: validated.itemId,
        day: validated.day ?? 1,
        order: validated.order ?? 0,
      })
      .returning();

    if (!newTripItem) {
      throw new InternalError('Failed to add item to trip');
    }

    return newTripItem;
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }

    logger.error(
      JSON.stringify(
        {
          message: 'Failed to add item to trip',
          service: 'trips.service',
          function: 'addItemToTrip',
          input,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );

    throw new InternalError('Failed to add item to trip', {
      originalError: error instanceof Error ? error.message : String(error),
    });
  }
}
