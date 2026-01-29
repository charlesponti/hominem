/**
 * Computed Music Types
 *
 * This file contains all derived types computed from the Music schema.
 * These types are computed ONCE and reused everywhere to minimize
 * TypeScript re-inference overhead.
 *
 * Rule: Import from this file, not from music.schema.ts
 */

import type { Artist, ArtistInsert } from './music.schema';

// ============================================
// PRIMARY OUTPUT TYPES (computed once)
// ============================================

/** Artist as retrieved from database */
export type ArtistOutput = Artist;

/** Artist insert input (for creating artists) */
export type ArtistInput = ArtistInsert;

// ============================================
// RE-EXPORT DRIZZLE TABLES
// ============================================

export {
  artists,
  userArtists,
} from './music.schema';
