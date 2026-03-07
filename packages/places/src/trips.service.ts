import crypto from 'node:crypto';
import type { Selectable } from 'kysely';

import { db } from '@hominem/db';
import type { Database, Json } from '@hominem/db';
import * as z from 'zod';

import type { TripItemOutput, TripOutput } from './contracts';

type TripRow = Selectable<Database['travel_trips']>;

export const createTripSchema = z.object({
  name: z.string().min(1, 'Trip name is required'),
  userId: z.string().uuid('Invalid user ID'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type CreateTripInput = z.infer<typeof createTripSchema>;

export const getAllTripsSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export type GetAllTripsInput = z.infer<typeof getAllTripsSchema>;

export const getTripByIdSchema = z.object({
  tripId: z.string().uuid('Invalid trip ID'),
  userId: z.string().uuid('Invalid user ID'),
});

export type GetTripByIdInput = z.infer<typeof getTripByIdSchema>;

export const addItemToTripSchema = z.object({
  tripId: z.string().uuid('Invalid trip ID'),
  itemId: z.string().uuid('Invalid item ID'),
  day: z.number().int().positive('Day must be positive').optional(),
  order: z.number().int().nonnegative('Order must be non-negative').optional(),
});

export type AddItemToTripInput = z.infer<typeof addItemToTripSchema>;

function toIsoDate(value?: Date): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function rowToTrip(row: TripRow): TripOutput {
  const createdAt = typeof row.created_at === 'string' ? row.created_at : new Date().toISOString();

  return {
    id: row.id,
    name: row.name,
    userId: row.user_id,
    startDate: typeof row.start_date === 'string' ? row.start_date : null,
    endDate: typeof row.end_date === 'string' ? row.end_date : null,
    createdAt,
    updatedAt: createdAt,
  };
}

function toItems(data: Json | null): TripItemOutput[] {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return [];
  }
  const rawItems = (data as Record<string, unknown>).items;
  if (!Array.isArray(rawItems)) {
    return [];
  }
  return rawItems
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null;
      }
      const obj = item as Record<string, unknown>;
      return {
        id: typeof obj.id === 'string' ? obj.id : crypto.randomUUID(),
        tripId: typeof obj.tripId === 'string' ? obj.tripId : '',
        itemId: typeof obj.itemId === 'string' ? obj.itemId : '',
        day: typeof obj.day === 'number' ? obj.day : null,
        order: typeof obj.order === 'number' ? obj.order : null,
        createdAt: typeof obj.createdAt === 'string' ? obj.createdAt : new Date().toISOString(),
      };
    })
    .filter((item): item is TripItemOutput => item !== null && item.tripId.length > 0 && item.itemId.length > 0);
}

function toTripDataJson(items: TripItemOutput[]): Json {
  // Convert items to a JSON-serializable format that matches what toItems expects
  const jsonItems = items.map((item) => ({
    id: item.id,
    tripId: item.tripId,
    itemId: item.itemId,
    day: item.day,
    order: item.order,
    createdAt: item.createdAt,
  }));
  return { items: jsonItems };
}

export async function createTrip(input: CreateTripInput): Promise<TripOutput> {
  const validated = createTripSchema.parse(input);
  const tripId = crypto.randomUUID();

  const row = await db
    .insertInto('travel_trips')
    .values({
      id: tripId,
      user_id: validated.userId,
      name: validated.name,
      start_date: toIsoDate(validated.startDate),
      end_date: validated.endDate ? toIsoDate(validated.endDate) : null,
      status: 'planned',
      data: { items: [] },
    })
    .returningAll()
    .executeTakeFirst();

  if (!row) {
    throw new Error('Failed to create trip');
  }

  return rowToTrip(row);
}

export async function getAllTrips(input: GetAllTripsInput): Promise<TripOutput[]> {
  const validated = getAllTripsSchema.parse(input);

  const rows = await db
    .selectFrom('travel_trips')
    .selectAll()
    .where('user_id', '=', validated.userId)
    .orderBy('start_date', 'desc')
    .orderBy('created_at', 'desc')
    .orderBy('id', 'asc')
    .execute();

  return rows.map(rowToTrip);
}

export async function getTripById(
  input: GetTripByIdInput,
): Promise<TripOutput & { items: TripItemOutput[] }> {
  const validated = getTripByIdSchema.parse(input);

  const row = await db
    .selectFrom('travel_trips')
    .selectAll()
    .where('id', '=', validated.tripId)
    .where('user_id', '=', validated.userId)
    .limit(1)
    .executeTakeFirst();

  if (!row) {
    throw new Error(`Trip not found for id ${validated.tripId}`);
  }

  return {
    ...rowToTrip(row),
    items: toItems(row.data ?? null),
  };
}

export async function addItemToTrip(input: AddItemToTripInput): Promise<TripItemOutput> {
  const validated = addItemToTripSchema.parse(input);

  const tripRow = await db
    .selectFrom('travel_trips')
    .selectAll()
    .where('id', '=', validated.tripId)
    .limit(1)
    .executeTakeFirst();

  if (!tripRow) {
    throw new Error(`Trip not found for id ${validated.tripId}`);
  }

  const currentItems = toItems(tripRow.data ?? null);
  const existingItem = currentItems.find((item) => item.itemId === validated.itemId);
  if (existingItem) {
    return existingItem;
  }

  const newItem: TripItemOutput = {
    id: crypto.randomUUID(),
    tripId: validated.tripId,
    itemId: validated.itemId,
    day: validated.day ?? 1,
    order: validated.order ?? 0,
    createdAt: new Date().toISOString(),
  };

   const nextItems = [...currentItems, newItem];

    await db
      .updateTable('travel_trips')
      .set({
        data: toTripDataJson(nextItems),
      })
     .where('id', '=', validated.tripId)
     .execute();

   return newItem;
}
