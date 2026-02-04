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
export type FlightOutput = Flight;
export type FlightInput = FlightInsert;

export type HotelOutput = Hotel;
export type HotelInput = HotelInsert;

export type TransportOutput = Transport;
export type TransportInput = TransportInsert;
