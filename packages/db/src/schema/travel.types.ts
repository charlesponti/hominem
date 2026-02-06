/**
 * Computed Travel Types
 *
 * This file contains all derived types computed from the Travel schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from travel.schema.ts
 */

import type {
  Flight,
  FlightInsert,
  FlightSelect,
  Hotel,
  HotelInsert,
  HotelSelect,
  Transport,
  TransportInsert,
  TransportSelect,
} from './travel.schema';

export type {
  Flight,
  FlightInsert,
  FlightSelect,
  Hotel,
  HotelInsert,
  HotelSelect,
  Transport,
  TransportInsert,
  TransportSelect,
};

// Legacy aliases for backward compatibility
/**
 * @deprecated Use {@link Flight} instead. This alias will be removed in a future version.
 */
export type FlightOutput = Flight;

/**
 * @deprecated Use {@link FlightInsert} instead. This alias will be removed in a future version.
 */
export type FlightInput = FlightInsert;

/**
 * @deprecated Use {@link Hotel} instead. This alias will be removed in a future version.
 */
export type HotelOutput = Hotel;

/**
 * @deprecated Use {@link HotelInsert} instead. This alias will be removed in a future version.
 */
export type HotelInput = HotelInsert;

/**
 * @deprecated Use {@link Transport} instead. This alias will be removed in a future version.
 */
export type TransportOutput = Transport;

/**
 * @deprecated Use {@link TransportInsert} instead. This alias will be removed in a future version.
 */
export type TransportInput = TransportInsert;
