import { z } from 'zod';
import type { ApiResult } from '@hominem/services';
import type { EmptyInput } from './utils';

// ============================================================================
// Data Types
// ============================================================================

export type Trip = {
  id: string;
  name: string;
  userId: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TripItem = {
  id: string;
  tripId: string;
  itemId: string;
  day: number | null;
  order: number | null;
  createdAt: string;
};

// ============================================================================
// GET ALL TRIPS
// ============================================================================

export type TripsGetAllInput = EmptyInput;
export type TripsGetAllOutput = ApiResult<Trip[]>;

// ============================================================================
// GET TRIP BY ID
// ============================================================================

export type TripsGetByIdInput = {
  id: string;
};

export const tripsGetByIdSchema = z.object({
  id: z.string().uuid(),
});

export type TripsGetByIdOutput = ApiResult<Trip>;

// ============================================================================
// CREATE TRIP
// ============================================================================

export type TripsCreateInput = {
  name: string;
  startDate?: string | Date;
  endDate?: string | Date;
};

export const tripsCreateInputSchema = z.object({
  name: z.string().min(1),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export type TripsCreateOutput = ApiResult<Trip>;

// ============================================================================
// ADD ITEM TO TRIP
// ============================================================================

export type TripsAddItemInput = {
  tripId: string;
  itemId: string;
  day?: number;
  order?: number;
};

export const tripsAddItemInputSchema = z.object({
  tripId: z.string().uuid(),
  itemId: z.string().uuid(),
  day: z.number().int().optional(),
  order: z.number().int().optional(),
});

export type TripsAddItemOutput = ApiResult<TripItem>;
