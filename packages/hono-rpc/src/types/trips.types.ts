/**
 * Explicit Type Contracts for Trips API
 *
 * Performance Benefit: These explicit types are resolved INSTANTLY by TypeScript.
 * No complex inference, no router composition, no type instantiation explosion.
 */

/**
 * Utility type to convert Date fields to strings for JSON serialization
 * This matches the reality of HTTP responses where dates are ISO strings
 */
type JsonSerialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Array<JsonSerialized<U>>
    : T extends object
      ? { [K in keyof T]: JsonSerialized<T[K]> }
      : T;

export interface Trip {
  id: string;
  name: string;
  userId: string;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripItem {
  id: string;
  tripId: string;
  itemId: string;
  day: number | null;
  order: number | null;
  createdAt: string;
}

// ============================================================================
// Trips GetAll
// ============================================================================

export type TripsGetAllOutput = Trip[];

// ============================================================================
// Trips GetById
// ============================================================================

export interface TripsGetByIdInput {
  id: string;
}

export type TripsGetByIdOutput = Trip;

// ============================================================================
// Trips Create
// ============================================================================

export interface TripsCreateInput {
  name: string;
  startDate?: Date;
  endDate?: Date;
}

export type TripsCreateOutput = JsonSerialized<Trip>;

// ============================================================================
// Trips AddItem
// ============================================================================

export interface TripsAddItemInput {
  tripId: string;
  itemId: string;
  day?: number;
  order?: number;
}

export type TripsAddItemOutput = TripItem;
