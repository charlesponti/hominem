/**
 * Computed Travel Types
 *
 * This file contains all derived types computed from Travel schemas.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from travel.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { flight, hotel, transport, activity } from './travel.schema'

// Inferred types from Drizzle schema
export type Flight = InferSelectModel<typeof flight>
export type FlightInsert = InferInsertModel<typeof flight>

export type Hotel = InferSelectModel<typeof hotel>
export type HotelInsert = InferInsertModel<typeof hotel>

export type Transport = InferSelectModel<typeof transport>
export type TransportInsert = InferInsertModel<typeof transport>

export type TravelActivity = InferSelectModel<typeof activity>
export type TravelActivityInsert = InferInsertModel<typeof activity>

// Legacy aliases for backward compatibility
export type FlightOutput = Flight
export type FlightInput = FlightInsert
export type FlightSelect = Flight

export type HotelOutput = Hotel
export type HotelInput = HotelInsert
export type HotelSelect = Hotel

export type TransportOutput = Transport
export type TransportInput = TransportInsert
export type TransportSelect = Transport

export type TravelActivityOutput = TravelActivity
export type TravelActivityInput = TravelActivityInsert
export type TravelActivitySelect = TravelActivity

// ============================================
// RE-EXPORT DRIZZLE TABLES (needed for db.query)
// ============================================

export { flight, flightRelations } from './travel.schema'
export { hotel } from './travel.schema'
export { transport } from './travel.schema'
export { activity } from './travel.schema'
