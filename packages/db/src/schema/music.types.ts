/**
 * Computed Music Types
 *
 * This file contains all derived types computed from the Music schema.
 * These types are inferred from Drizzle ORM schema definitions.
 *
 * Rule: Import from this file, not from music.schema.ts
 */

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { artists, userArtists } from './music.schema'

// Inferred types from Drizzle schema
export type Artist = InferSelectModel<typeof artists>
export type ArtistInsert = InferInsertModel<typeof artists>

export type UserArtist = InferSelectModel<typeof userArtists>
export type UserArtistInsert = InferInsertModel<typeof userArtists>

// Legacy aliases for backward compatibility
export type ArtistOutput = Artist
export type ArtistInput = ArtistInsert

export type UserArtistOutput = UserArtist
export type UserArtistInput = UserArtistInsert

// ============================================
// RE-EXPORT DRIZZLE TABLES
// ============================================

export {
  artists,
  userArtists,
} from './music.schema'
