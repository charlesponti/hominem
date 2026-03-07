import crypto from 'node:crypto';

import { db, NotFoundError, sql } from '@hominem/db';
import * as z from 'zod';

import type { TripItemOutput, TripOutput } from './contracts';

interface TripRow {
  id: string;
  user_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
  data: Record<string, unknown> | null;
}

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

function resultRows<T>(result: unknown): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }
  if (result && typeof result === 'object' && 'rows' in result) {
    const rows = (result as { rows?: unknown }).rows;
    if (Array.isArray(rows)) {
      return rows as T[];
    }
  }
  return [];
}

function toIsoDate(value?: Date): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  return value.toISOString().slice(0, 10);
}

function rowToTrip(row: TripRow): TripOutput {
  const createdAt = row.created_at ?? new Date().toISOString();
  return {
    id: row.id,
    name: row.name,
    userId: row.user_id,
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt,
    updatedAt: createdAt,
  };
}

function toItems(data: Record<string, unknown> | null): TripItemOutput[] {
  if (!data) {
    return [];
  }
  const rawItems = data.items;
  if (!Array.isArray(rawItems)) {
    return [];
  }
  return rawItems
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
      tripId: typeof item.tripId === 'string' ? item.tripId : '',
      itemId: typeof item.itemId === 'string' ? item.itemId : '',
      day: typeof item.day === 'number' ? item.day : null,
      order: typeof item.order === 'number' ? item.order : null,
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    }))
    .filter((item) => item.tripId.length > 0 && item.itemId.length > 0);
}

export async function createTrip(input: CreateTripInput): Promise<TripOutput> {
  const validated = createTripSchema.parse(input);
  const tripId = crypto.randomUUID();

  const result = await db.execute(sql`
    insert into travel_trips (id, user_id, name, start_date, end_date, status, data)
    values (
      ${tripId},
      ${validated.userId},
      ${validated.name},
      ${toIsoDate(validated.startDate)},
      ${validated.endDate ? toIsoDate(validated.endDate) : null},
      'planned',
      ${JSON.stringify({ items: [] })}::jsonb
    )
    returning id, user_id, name, start_date, end_date, created_at, data
  `);

  const row = resultRows<TripRow>(result)[0] ?? null;
  if (!row) {
    throw new Error('Failed to create trip');
  }

  return rowToTrip(row);
}

export async function getAllTrips(input: GetAllTripsInput): Promise<TripOutput[]> {
  const validated = getAllTripsSchema.parse(input);

  const result = await db.execute(sql`
    select id, user_id, name, start_date, end_date, created_at, data
    from travel_trips
    where user_id = ${validated.userId}
    order by start_date desc nulls last, created_at desc, id asc
  `);

  return resultRows<TripRow>(result).map(rowToTrip);
}

export async function getTripById(
  input: GetTripByIdInput,
): Promise<TripOutput & { items: TripItemOutput[] }> {
  const validated = getTripByIdSchema.parse(input);

  const result = await db.execute(sql`
    select id, user_id, name, start_date, end_date, created_at, data
    from travel_trips
    where id = ${validated.tripId}
      and user_id = ${validated.userId}
    limit 1
  `);

  const row = resultRows<TripRow>(result)[0] ?? null;
  if (!row) {
    throw new NotFoundError(`Trip not found for id ${validated.tripId}`);
  }

  return {
    ...rowToTrip(row),
    items: toItems(row.data),
  };
}

export async function addItemToTrip(input: AddItemToTripInput): Promise<TripItemOutput> {
  const validated = addItemToTripSchema.parse(input);

  const tripResult = await db.execute(sql`
    select id, user_id, name, start_date, end_date, created_at, data
    from travel_trips
    where id = ${validated.tripId}
    limit 1
  `);

  const tripRow = resultRows<TripRow>(tripResult)[0] ?? null;
  if (!tripRow) {
    throw new NotFoundError(`Trip not found for id ${validated.tripId}`);
  }

  const currentItems = toItems(tripRow.data);
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

  await db.execute(sql`
    update travel_trips
    set data = ${JSON.stringify({ items: nextItems })}::jsonb
    where id = ${validated.tripId}
  `);

  return newItem;
}
