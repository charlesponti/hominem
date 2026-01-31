/**
 * Computed Place Types
 *
 * This file contains all derived types computed from Place schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from places.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { place, placeTags, routeWaypoints, transportationRoutes } from './places.schema'

// Inferred types from Drizzle schema
export type Place = InferSelectModel<typeof place>
export type PlaceInsert = InferInsertModel<typeof place>
export type PlaceTag = InferSelectModel<typeof placeTags>
export type PlaceTagInsert = InferInsertModel<typeof placeTags>
export type RouteWaypoint = InferSelectModel<typeof routeWaypoints>
export type RouteWaypointInsert = InferInsertModel<typeof routeWaypoints>
export type TransportationRoute = InferSelectModel<typeof transportationRoutes>
export type TransportationRouteInsert = InferInsertModel<typeof transportationRoutes>

// Legacy aliases for backward compatibility
export type PlaceOutput = Place
export type PlaceInput = PlaceInsert
export type PlaceSelect = Place

export type PlaceTagOutput = PlaceTag
export type PlaceTagInput = PlaceTagInsert

export type RouteWaypointOutput = RouteWaypoint
export type RouteWaypointInput = RouteWaypointInsert

export type TransportationRouteOutput = TransportationRoute
export type TransportationRouteInput = TransportationRouteInsert

// Re-export tables for convenience
export {
  place,
  placeTags,
  routeWaypoints,
  transportationRoutes,
  placeRelations,
} from './places.schema'
