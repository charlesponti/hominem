/**
 * Computed Movie Types
 *
 * This file contains all derived types computed from Movie schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from movies.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { movie, movieViewings } from './movies.schema'

// Inferred types from Drizzle schema
export type Movie = InferSelectModel<typeof movie>
export type MovieInsert = InferInsertModel<typeof movie>

export type MovieViewing = InferSelectModel<typeof movieViewings>
export type MovieViewingInsert = InferInsertModel<typeof movieViewings>

// Legacy aliases for backward compatibility
export type MovieOutput = Movie
export type MovieInput = MovieInsert

export type MovieViewingOutput = MovieViewing
export type MovieViewingInput = MovieViewingInsert

export { movie, movieViewings, movieRelations, movieViewingsRelations } from './movies.schema'
